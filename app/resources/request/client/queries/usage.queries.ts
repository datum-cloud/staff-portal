import { fetchOrgUsageSummary } from '../apis/usage.api';
import type { OrgUsageSummary } from '@/modules/billing/org-usage.types';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export const usageQueryKeys = {
  all: ['org-usage'] as const,
  summary: (orgName: string, cycle: string) =>
    [...usageQueryKeys.all, 'summary', orgName, cycle] as const,
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
