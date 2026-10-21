import { buildBillingCycleWindows, selectBillingCycleWindow } from './billing-cycle';
import type { OrgUsageMeterSummary, OrgUsageStatus, OrgUsageSummary } from './org-usage.types';
import { fetchOrgUsage, resolveBillingAccountForUsageScope } from './usage.server';

function isAuthStatus(status: number | undefined): boolean {
  return status === 401 || status === 403;
}

function authStatusFromError(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

function emptySummary(
  status: OrgUsageStatus,
  cycle: { label: string; rangeLabel: string },
  message?: string
): OrgUsageSummary {
  return {
    status,
    cycleLabel: cycle.label,
    cycleRangeLabel: cycle.rangeLabel,
    meters: [],
    message,
  };
}

/**
 * Current billing-cycle usage summary for an org overview card.
 * Uses the same `UsageQuery` fetch as the usage page.
 */
export async function loadOrgUsageSummary(
  orgName: string,
  token: string,
  cycleParam: string | null = 'current'
): Promise<OrgUsageSummary> {
  const fallbackCycle = buildBillingCycleWindows(undefined)[0];

  const scopedBillingAccount = await resolveBillingAccountForUsageScope(
    orgName,
    token,
    'all'
  ).catch((err) => {
    if (isAuthStatus(authStatusFromError(err))) {
      return 'auth' as const;
    }
    throw err;
  });

  if (scopedBillingAccount === 'auth') {
    return emptySummary(
      'insufficient-permissions',
      fallbackCycle,
      'Billing permissions are still being provisioned for this organization.'
    );
  }

  const cycleWindows = buildBillingCycleWindows(scopedBillingAccount?.paymentTerms);
  const cycle = selectBillingCycleWindow(cycleWindows, cycleParam);

  const usage = await fetchOrgUsage(orgName, token, {
    range: { startSec: cycle.startSec, endSec: cycle.endSec },
  });

  if (usage.status !== 'ok') {
    const message =
      usage.status === 'insufficient-permissions'
        ? 'Billing permissions are still being provisioned for this organization.'
        : 'This organization does not have a billing account.';
    return emptySummary(usage.status, cycle, message);
  }

  if (usage.meters.length === 0) {
    return emptySummary('no-meters', cycle, 'No MeterDefinitions were found for this environment.');
  }

  const meters: OrgUsageMeterSummary[] = usage.meters
    .map((meter) => {
      const summary: OrgUsageMeterSummary = {
        meterDefinition: meter.meterDefinition,
        label: meter.label,
        unit: meter.unit,
        aggregation: meter.aggregation,
        used: meter.total,
        limit: 0,
      };
      if (meter.spend) summary.spend = meter.spend;
      if (meter.spendError) summary.spendError = meter.spendError;
      return summary;
    })
    .filter((meter) => meter.used > 0)
    .sort((a, b) => b.used - a.used);

  return {
    status: 'ok',
    cycleLabel: cycle.label,
    cycleRangeLabel: cycle.rangeLabel,
    meters,
    spend: usage.spend,
    spendError: usage.spendError,
  };
}
