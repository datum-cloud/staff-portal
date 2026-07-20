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

export async function fetchOrgUsageDashboard(
  orgName: string,
  project: string = 'all',
  cycle: 'current' | 'previous' = 'current'
): Promise<OrgUsageDashboardData> {
  const search = new URLSearchParams({ orgName, cycle });
  if (project && project !== 'all') {
    search.set('project', project);
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
