import type { UsageSpendComparison } from '../lib/account-health';
import { getAccountCurrency, type BillingAccount } from '../utils';
import type { LoadState } from './load-state';
import type { OrgUsageDashboardData } from '@/modules/billing/usage.types';
import { useOrgUsageDashboardQueries, useOrgUsageDashboardQuery } from '@/resources/request/client';
import { useMemo } from 'react';

/** Spend from a usage dashboard response, or `undefined` when it couldn't be priced. */
const spendAmount = (data: OrgUsageDashboardData | undefined): number | undefined =>
  data?.usage.status === 'ok' && !data.usage.spendError
    ? (data.usage.spend?.amount ?? 0)
    : undefined;

export interface AccountUsageSpend extends LoadState {
  /** This cycle's usage, scoped to the account. */
  current?: OrgUsageDashboardData;
  /** Spend so far against last cycle's at the same point; `undefined` until both load. */
  comparison?: UsageSpendComparison;
  /** Last cycle's figures are still loading; `isLoading` covers this cycle only. */
  isComparisonLoading: boolean;
}

/**
 * This cycle's usage for the account, and the previous cycle cut at the same
 * point for the "vs last cycle" trend. The server works out that point from
 * its own clock, the same one it builds the current cycle's window from.
 */
export function useAccountUsageSpend(orgName: string, account: BillingAccount): AccountUsageSpend {
  const accountName = account.metadata?.name ?? '';
  const enabled = Boolean(orgName && accountName);

  const current = useOrgUsageDashboardQuery(orgName, 'all', 'current', {
    scope: { billingAccount: accountName },
    enabled,
  });
  const previous = useOrgUsageDashboardQuery(orgName, 'all', 'previous', {
    scope: { billingAccount: accountName, samePoint: true },
    enabled,
  });

  const comparison = useMemo((): UsageSpendComparison | undefined => {
    const currentSpend = spendAmount(current.data);
    const previousSpend = spendAmount(previous.data);
    if (currentSpend === undefined || previousSpend === undefined) return undefined;
    return {
      current: currentSpend,
      previous: previousSpend,
      currency: current.data?.usage.spend?.currency ?? getAccountCurrency(account),
    };
  }, [current.data, previous.data, account]);

  return {
    current: current.data,
    comparison,
    isLoading: current.isLoading,
    isComparisonLoading: previous.isLoading,
    isError: current.isError,
  };
}

/** Most projects to fetch spend for at once: each is a full usage dashboard request. */
export const MAX_PROJECT_SPEND_REQUESTS = 25;

export interface ProjectSpend extends LoadState {
  /** This cycle's spend; `undefined` while loading or when it couldn't be priced. */
  amount?: number;
  /** Past MAX_PROJECT_SPEND_REQUESTS, so not fetched. */
  skipped?: boolean;
}

/**
 * This cycle's spend for each project, scoped to the account. Keyed by
 * project name; each project loads and fails on its own. Only the first
 * MAX_PROJECT_SPEND_REQUESTS projects are fetched.
 */
export function useAccountProjectSpend(
  orgName: string,
  account: BillingAccount,
  projects: readonly string[]
): ReadonlyMap<string, ProjectSpend> {
  const accountName = account.metadata?.name ?? '';
  const fetched = useMemo(() => projects.slice(0, MAX_PROJECT_SPEND_REQUESTS), [projects]);
  const results = useOrgUsageDashboardQueries(orgName, fetched, 'current', {
    scope: { billingAccount: accountName },
  });
  return new Map(
    projects.map((project, index): [string, ProjectSpend] => {
      const result = results[index];
      return result
        ? [
            project,
            {
              amount: spendAmount(result.data),
              isLoading: result.isLoading,
              isError: result.isError,
            },
          ]
        : [project, { isLoading: false, isError: false, skipped: true }];
    })
  );
}
