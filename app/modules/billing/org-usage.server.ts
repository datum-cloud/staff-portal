import { buildBillingCycleWindows, selectBillingCycleWindow } from './billing-cycle';
import type { OrgUsageMeterSummary, OrgUsageStatus, OrgUsageSummary } from './org-usage.types';
import { fetchOrgUsage, resolveBillingAccountForUsageScope } from './usage.server';

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
  // Resolves to null on any error; the UsageQuery below reports permissions.
  const scopedBillingAccount = await resolveBillingAccountForUsageScope(orgName, token, 'all');

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
    // The card orders meters by spend; raw usage isn't comparable across units.
    .filter((meter) => meter.used > 0);

  return {
    status: 'ok',
    cycleLabel: cycle.label,
    cycleRangeLabel: cycle.rangeLabel,
    meters,
    spend: usage.spend,
    spendError: usage.spendError,
  };
}
