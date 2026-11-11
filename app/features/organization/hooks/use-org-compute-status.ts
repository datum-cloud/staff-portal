import { toProjectComputeStatus, type ProjectComputeStatus } from '../lib/compute-status';
import { usePlugins } from '@/modules/plugins/client/use-plugins';
import { findWorkloadListPluginSlug } from '@/modules/plugins/client/workload-plugin';
import { useOrgAllProjectsQuery, useProjectComputeQueries } from '@/resources/request/client';
import { useMemo } from 'react';

/** Loading and error flags returned alongside each project's data. */
export interface LoadState {
  isLoading: boolean;
  isError: boolean;
}

export interface ProjectCompute extends LoadState {
  /** `undefined` until the project loads, and when it couldn't be read. */
  compute?: ProjectComputeStatus;
  /** Why the project couldn't be read, when `isError`. */
  error?: unknown;
  /** When this project's data last arrived (ms), 0 if never. */
  updatedAt: number;
}

export interface OrgComputeStatus extends LoadState {
  /** False when no compute plugin is installed; nothing is fetched then. */
  enabled: boolean;
  /** Each of the organization's projects, in list order. */
  projects: ReadonlyMap<string, ProjectCompute>;
}

/**
 * Workloads and Instances across every project in an organization (#765).
 *
 * Only runs when the compute plugin is installed: its pages are what the
 * links point to, and without it the overview shows no compute. Every project
 * is fetched, a limited number at a time (`useProjectComputeQueries`), and
 * each loads and fails on its own; the top-level `isError` only covers the
 * plugin and project lists.
 */
export function useOrgComputeStatus(orgName: string): OrgComputeStatus {
  const pluginsQuery = usePlugins();
  const pluginSlug = useMemo(
    () => findWorkloadListPluginSlug(pluginsQuery.data ?? []),
    [pluginsQuery.data]
  );
  const enabled = Boolean(pluginSlug);

  const projectsQuery = useOrgAllProjectsQuery(orgName, { enabled });
  const projectNames = useMemo(
    () => (projectsQuery.data?.items ?? []).map((project) => project.name).filter(Boolean),
    [projectsQuery.data]
  );

  const results = useProjectComputeQueries(projectNames, { enabled });

  // `useQueries` returns a new array every render; rebuild only when a
  // project's query actually changes.
  const resultsKey = results
    .map((r) => `${r.status}:${r.dataUpdatedAt}:${r.errorUpdatedAt}`)
    .join('|');

  const projects = useMemo(
    () =>
      new Map(
        projectNames.map((projectName, index): [string, ProjectCompute] => {
          const result = results[index];
          return [
            projectName,
            {
              isLoading: result?.isLoading ?? true,
              isError: result?.isError ?? false,
              updatedAt: result?.dataUpdatedAt ?? 0,
              ...(result?.data &&
                pluginSlug && {
                  compute: toProjectComputeStatus(result.data, projectName, pluginSlug),
                }),
              ...(result?.isError && { error: result.error }),
            },
          ];
        })
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `resultsKey` tracks `results`
    [projectNames, pluginSlug, resultsKey]
  );

  const isLoading = pluginsQuery.isLoading || (enabled && projectsQuery.isLoading);
  const isError = pluginsQuery.isError || projectsQuery.isError;

  // Stable between renders, so callers can depend on the whole result.
  return useMemo(
    () => ({ enabled, projects, isLoading, isError }),
    [enabled, projects, isLoading, isError]
  );
}
