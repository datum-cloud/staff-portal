import {
  fetchOrgUsageDashboard,
  fetchOrgUsageSummary,
  type UsageDashboardScope,
} from '../apis/usage.api';
import type { OrgUsageSummary } from '@/modules/billing/org-usage.types';
import type { OrgUsageDashboardData } from '@/modules/billing/usage.types';
import { shouldRetryQuery } from '@/modules/tanstack/query';
import { useQueries, useQuery, type UseQueryOptions } from '@tanstack/react-query';

export const usageQueryKeys = {
  all: ['org-usage'] as const,
  summary: (orgName: string, cycle: string) =>
    [...usageQueryKeys.all, 'summary', orgName, cycle] as const,
  dashboard: (orgName: string, project: string, cycle: string, scope: UsageDashboardScope = {}) =>
    [
      ...usageQueryKeys.all,
      'dashboard',
      orgName,
      project,
      cycle,
      scope.billingAccount ?? null,
      scope.samePoint ?? false,
    ] as const,
};

export function useOrgUsageSummaryQuery(
  orgName: string,
  cycle: 'current' | 'previous' = 'current',
  options?: Omit<UseQueryOptions<OrgUsageSummary>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: usageQueryKeys.summary(orgName, cycle),
    queryFn: () => fetchOrgUsageSummary(orgName, cycle),
    enabled: !!orgName,
    staleTime: 60 * 1000,
    ...options,
  });
}

/** Key, fetch and freshness for one usage dashboard query; shared by both hooks below. */
export const usageDashboardQueryOptions = (
  orgName: string,
  project: string = 'all',
  cycle: 'current' | 'previous' = 'current',
  scope: UsageDashboardScope = {}
) => ({
  queryKey: usageQueryKeys.dashboard(orgName, project, cycle, scope),
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    fetchOrgUsageDashboard(orgName, project, cycle, scope, signal),
  enabled: !!orgName && !!project,
  staleTime: 60 * 1000,
});

export function useOrgUsageDashboardQuery(
  orgName: string,
  project: string = 'all',
  cycle: 'current' | 'previous' = 'current',
  options?: Omit<UseQueryOptions<OrgUsageDashboardData>, 'queryKey' | 'queryFn'> & {
    /** Scope to one billing account and/or cut the previous cycle at the same point. */
    scope?: UsageDashboardScope;
  }
) {
  const { scope, ...overrides } = options ?? {};
  return useQuery({ ...usageDashboardQueryOptions(orgName, project, cycle, scope), ...overrides });
}

/**
 * One usage dashboard query per project, e.g. spend per linked project.
 * Results are in `projects` order; each loads and fails on its own. Each is
 * a full usage query, so these retry once and don't refetch on focus.
 */
export function useOrgUsageDashboardQueries(
  orgName: string,
  projects: readonly string[],
  cycle: 'current' | 'previous' = 'current',
  options: { scope?: UsageDashboardScope } = {}
) {
  return useQueries({
    queries: projects.map((project) => ({
      ...usageDashboardQueryOptions(orgName, project, cycle, options.scope),
      // Once, and never on a 4xx.
      retry: (failureCount: number, error: unknown) =>
        failureCount < 1 && shouldRetryQuery(failureCount, error),
      refetchOnWindowFocus: false,
    })),
  });
}
