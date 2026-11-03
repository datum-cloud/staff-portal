import type { OrgUsageSummary } from '@/modules/billing/org-usage.types';
import type { OrgUsageDashboardData } from '@/modules/billing/usage.types';

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

/** Narrows the usage dashboard to one billing account, optionally cut off at `until`. */
export interface UsageDashboardScope {
  billingAccount?: string;
  /** ISO 8601 time; the selected cycle's query stops here. */
  until?: string;
}

export async function fetchOrgUsageDashboard(
  orgName: string,
  project: string = 'all',
  cycle: 'current' | 'previous' = 'current',
  scope: UsageDashboardScope = {}
): Promise<OrgUsageDashboardData> {
  const search = new URLSearchParams({ orgName, cycle });
  if (project && project !== 'all') {
    search.set('project', project);
  }
  if (scope.billingAccount) {
    search.set('billingAccount', scope.billingAccount);
  }
  if (scope.until) {
    search.set('until', scope.until);
  }
  const response = await fetch(`/api/usage/dashboard?${search.toString()}`);
  const body = (await response.json().catch(() => ({}))) as {
    data?: OrgUsageDashboardData;
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? body.message ?? 'Failed to load usage dashboard');
  }

  if (!body.data) {
    throw new Error('Failed to load usage dashboard');
  }

  return body.data;
}
