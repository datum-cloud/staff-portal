import {
  fetchOrgUsageDashboard,
  fetchOrgUsageSummary,
  type UsageDashboardScope,
} from '../apis/usage.api';
import type { OrgUsageSummary } from '@/modules/billing/org-usage.types';
import type { OrgUsageDashboardData } from '@/modules/billing/usage.types';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

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
      scope.until ?? null,
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
    /** Scope to one billing account and/or cut the cycle off early. */
    scope?: UsageDashboardScope;
  }
) {
  const { scope = {}, ...queryOptions } = options ?? {};
  return useQuery({
    queryKey: usageQueryKeys.dashboard(orgName, project, cycle, scope),
    queryFn: () => fetchOrgUsageDashboard(orgName, project, cycle, scope),
    enabled: !!orgName,
    staleTime: 60 * 1000,
    ...queryOptions,
  });
}
