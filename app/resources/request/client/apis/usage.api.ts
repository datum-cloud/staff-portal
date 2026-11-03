import type { OrgUsageSummary } from '@/modules/billing/org-usage.types';
import type { OrgUsageDashboardData } from '@/modules/billing/usage.types';
import { HttpError } from '@/utils/errors';

export async function fetchOrgUsageSummary(
  orgName: string,
  cycle: 'current' | 'previous' = 'current'
): Promise<OrgUsageSummary> {
  const search = new URLSearchParams({ orgName, cycle });
  const response = await fetch(`/api/usage?${search.toString()}`);
  const body = (await response.json().catch(() => ({}))) as {
    data?: OrgUsageSummary;
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? body.message ?? 'Failed to load usage data');
  }

  if (!body.data) {
    throw new Error('Failed to load usage data');
  }

  return body.data;
}

/** Narrows the usage dashboard to one billing account. */
export interface UsageDashboardScope {
  billingAccount?: string;
  /**
   * For the previous cycle: stop at the same point in it as now is in the
   * current one. The server works the point out from its own clock and the
   * account's terms, so it always matches the current cycle's window.
   */
  samePoint?: boolean;
}

export async function fetchOrgUsageDashboard(
  orgName: string,
  project: string = 'all',
  cycle: 'current' | 'previous' = 'current',
  scope: UsageDashboardScope = {},
  signal?: AbortSignal
): Promise<OrgUsageDashboardData> {
  const search = new URLSearchParams({ orgName, cycle });
  if (project && project !== 'all') {
    search.set('project', project);
  }
  if (scope.billingAccount) {
    search.set('billingAccount', scope.billingAccount);
  }
  if (scope.samePoint) {
    search.set('samePoint', 'true');
  }
  const response = await fetch(`/api/usage/dashboard?${search.toString()}`, { signal });
  const body = (await response.json().catch(() => ({}))) as {
    data?: OrgUsageDashboardData;
    error?: string;
    message?: string;
    requestId?: string;
  };

  if (!response.ok) {
    // Carries the status so a 4xx isn't retried.
    throw new HttpError(
      body.error ?? body.message ?? 'Failed to load usage dashboard',
      response.status,
      body.requestId
    );
  }

  if (!body.data) {
    throw new Error('Failed to load usage dashboard');
  }

  return body.data;
}
