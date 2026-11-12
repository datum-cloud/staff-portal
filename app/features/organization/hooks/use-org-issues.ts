import {
  collectOrgIssues,
  countByArea,
  ISSUE_AREAS,
  type AreaCount,
  type IssueArea,
  type OrgIssue,
  type ProjectNetworkStatus,
} from '../lib/org-issues';
import { useOrgComputeStatus, type LoadState } from './use-org-compute-status';
import {
  useOrgAllProjectsQuery,
  useOrgQuotaBucketListQuery,
  useProjectNetworkQueries,
} from '@/resources/request/client';
import { useMemo } from 'react';

export interface AreaState extends AreaCount, LoadState {
  /** False for compute areas when no compute plugin is installed. */
  enabled: boolean;
  /** Projects this area couldn't read, so its counts are incomplete. */
  unreadProjects: string[];
}

export interface OrgIssues {
  /** Sorted: severity, then most recently started. */
  issues: OrgIssue[];
  areas: Record<IssueArea, AreaState>;
  /** When the newest data arrived (ms); undefined until something loads. */
  checkedAt?: number;
  /** The project list itself is loading or failed. */
  isLoading: boolean;
  isError: boolean;
}

const COMPUTE_AREAS = new Set<IssueArea>(['workloads', 'instances']);

/**
 * Everything broken across an organization (#766): compute from
 * `useOrgComputeStatus`, plus every project's load balancers, domains, DNS
 * zones and quota, plus the organization's own quota, turned into one sorted
 * issue list with per-area counts. Each area reports its own loading and error
 * state, so one failing source only marks its own part of the page.
 */
export function useOrgIssues(orgName: string): OrgIssues {
  const compute = useOrgComputeStatus(orgName);

  const projectsQuery = useOrgAllProjectsQuery(orgName);
  const projectNames = useMemo(
    () => (projectsQuery.data?.items ?? []).map((project) => project.name).filter(Boolean),
    [projectsQuery.data]
  );

  const network = useProjectNetworkQueries(projectNames);
  const orgQuota = useOrgQuotaBucketListQuery(orgName);

  // `useQueries` returns a new array every render; rebuild only on real changes.
  const networkKey = network
    .map((r) => `${r.status}:${r.dataUpdatedAt}:${r.errorUpdatedAt}`)
    .join('|');

  return useMemo(() => {
    const networkByProject = new Map(
      projectNames.map((name, index) => [name, network[index]] as const)
    );

    const updates = [
      ...network.map((r) => r.dataUpdatedAt),
      ...[...compute.projects.values()].map((p) => p.updatedAt),
      orgQuota.dataUpdatedAt,
    ].filter((time) => time > 0);
    const checkedAt = updates.length > 0 ? Math.max(...updates) : undefined;

    const { issues, totals } = collectOrgIssues(
      {
        orgName,
        projects: projectNames.map((name) => ({
          name,
          compute: compute.projects.get(name)?.compute,
          network: networkByProject.get(name)?.data as ProjectNetworkStatus | undefined,
        })),
        orgQuotaBuckets: orgQuota.data?.items ?? [],
      },
      // The rules are judged as of the last check, so a result doesn't shift
      // between renders; it moves on when data refreshes.
      checkedAt ?? 0
    );
    const counts = countByArea(issues, totals);

    const computeUnread = [...compute.projects]
      .filter(([, project]) => project.isError)
      .map(([name]) => name);
    const networkUnread = projectNames.filter((name) => networkByProject.get(name)?.isError);
    const computeLoading =
      compute.isLoading || [...compute.projects.values()].some((p) => p.isLoading);
    const networkLoading = projectsQuery.isLoading || network.some((r) => r.isLoading);

    const stateFor = (area: IssueArea): AreaState => {
      if (COMPUTE_AREAS.has(area)) {
        return {
          ...counts[area],
          enabled: compute.enabled,
          isLoading: computeLoading,
          isError: compute.isError,
          unreadProjects: computeUnread,
        };
      }
      const quota = area === 'quota';
      return {
        ...counts[area],
        enabled: true,
        isLoading: networkLoading || (quota && orgQuota.isLoading),
        isError: projectsQuery.isError || (quota && orgQuota.isError),
        unreadProjects: networkUnread,
      };
    };

    return {
      issues,
      areas: Object.fromEntries(ISSUE_AREAS.map((area) => [area, stateFor(area)])) as Record<
        IssueArea,
        AreaState
      >,
      ...(checkedAt !== undefined && { checkedAt }),
      isLoading: projectsQuery.isLoading,
      isError: projectsQuery.isError,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `networkKey` tracks `network`
  }, [
    orgName,
    projectNames,
    networkKey,
    compute,
    orgQuota.data,
    orgQuota.isLoading,
    orgQuota.isError,
    orgQuota.dataUpdatedAt,
    projectsQuery.isLoading,
    projectsQuery.isError,
  ]);
}
