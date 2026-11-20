import {
  summarizeProjectHealth,
  type ProjectHealthInput,
  type ProjectHealthRow,
  type SourceState,
} from '../lib/project-health';
import { useOrgComputeStatus, type ProjectCompute } from './use-org-compute-status';
import { useOrgIssues } from './use-org-issues';
import { useOrgAllProjectsQuery, useProjectNetworkQueries } from '@/resources/request/client';
import { mapApiError } from '@/utils/errors/error-mapper';
import { useMemo } from 'react';

export interface OrgProjectHealth {
  rows: ProjectHealthRow[];
  /** The project list itself is loading. */
  isLoading: boolean;
  /** The project list itself failed. */
  isError: boolean;
}

const statusCodeOf = (error: unknown): number | undefined =>
  error ? mapApiError(error).statusCode : undefined;

const computeSource = (
  project: ProjectCompute | undefined
): SourceState<{ workloads: number; instances: number }> => {
  if (project?.isError) return { status: 'error', statusCode: statusCodeOf(project.error) };
  if (!project?.compute) return { status: 'loading' };
  return {
    status: 'ok',
    value: {
      workloads: project.compute.workloads.length,
      instances: project.compute.instances.length,
    },
  };
};

interface NetworkResult {
  isError: boolean;
  error: unknown;
  data?: { proxies?: readonly unknown[] };
}

const networkSource = (
  result: NetworkResult | undefined
): SourceState<{ loadBalancers: number }> => {
  if (result?.isError) return { status: 'error', statusCode: statusCodeOf(result.error) };
  if (!result?.data) return { status: 'loading' };
  // The project loaded, but its load balancer list on its own failed.
  if (!result.data.proxies) return { status: 'error' };
  return { status: 'ok', value: { loadBalancers: result.data.proxies.length } };
};

/**
 * Each project's health for the overview's Projects card (#770), built from
 * the queries the overview already makes (the project list, compute, network
 * and issues), so it fetches nothing new.
 */
export function useOrgProjectHealth(orgName: string): OrgProjectHealth {
  const projectsQuery = useOrgAllProjectsQuery(orgName);
  const projectNames = useMemo(
    () => (projectsQuery.data?.items ?? []).map((project) => project.name).filter(Boolean),
    [projectsQuery.data]
  );
  const compute = useOrgComputeStatus(orgName);
  const network = useProjectNetworkQueries(projectNames);
  const { issues } = useOrgIssues(orgName);

  // `useQueries` returns a new array every render; rebuild only on real changes.
  const networkKey = network
    .map((r) => `${r.status}:${r.dataUpdatedAt}:${r.errorUpdatedAt}`)
    .join('|');

  const rows = useMemo(() => {
    const inputs = projectNames.map((name, index): ProjectHealthInput => ({
      name,
      // Until the plugin list arrives we can't tell whether compute is on, so
      // treat it as loading rather than calling a project healthy without it.
      ...(compute.pluginPending
        ? { compute: { status: 'loading' as const } }
        : compute.enabled && { compute: computeSource(compute.projects.get(name)) }),
      network: networkSource(network[index]),
    }));
    return summarizeProjectHealth(inputs, issues);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `networkKey` tracks `network`
  }, [projectNames, compute.enabled, compute.pluginPending, compute.projects, networkKey, issues]);

  return { rows, isLoading: projectsQuery.isLoading, isError: projectsQuery.isError };
}
