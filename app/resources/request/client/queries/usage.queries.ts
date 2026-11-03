import {
  fetchOrgUsageDashboard,
  fetchOrgUsageSummary,
  type UsageDashboardScope,
} from '../apis/usage.api';
import type { OrgUsageSummary } from '@/modules/billing/org-usage.types';
import type { OrgUsageDashboardData } from '@/modules/billing/usage.types';
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

export function useOrgUsageDashboardQuery(
  orgName: string,
  project: string = 'all',
  cycle: 'current' | 'previous' = 'current',
  options?: Omit<UseQueryOptions<OrgUsageDashboardData>, 'queryKey' | 'queryFn'> & {
    /** Scope to one billing account and/or cut the previous cycle at the same point. */
    scope?: UsageDashboardScope;
  }
) {
  const { scope = {}, ...queryOptions } = options ?? {};
  return useQuery({
    queryKey: usageQueryKeys.dashboard(orgName, project, cycle, scope),
    queryFn: ({ signal }) => fetchOrgUsageDashboard(orgName, project, cycle, scope, signal),
    enabled: !!orgName,
    staleTime: 60 * 1000,
    ...queryOptions,
  });
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
  scope: UsageDashboardScope = {}
) {
  return useQueries({
    queries: projects.map((project) => ({
      queryKey: usageQueryKeys.dashboard(orgName, project, cycle, scope),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchOrgUsageDashboard(orgName, project, cycle, scope, signal),
      enabled: !!orgName && !!project,
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    })),
  });
}
