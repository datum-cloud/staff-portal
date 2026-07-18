import type { OrgUsageSummary } from '@/modules/billing/org-usage.types';

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
