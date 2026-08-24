import {
  buildBillingCycleWindows,
  selectBillingCycleWindow,
  type PaymentTermsInput,
} from './billing-cycle';
import type { OrgUsageMeterSummary, OrgUsageStatus, OrgUsageSummary } from './org-usage.types';
import { fetchUsageCosts } from './usage-cost.server';
import { getOrgControlPlaneBaseURL } from '@/resources/request/client/apis/control-plane';
import { env } from '@/utils/config/env.server';
import { listBillingMiloapisComV1Alpha1NamespacedBillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import type { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

interface MeterDefinition {
  meterApiName: string;
  meterName: string;
  displayName: string;
  unit?: string;
}

interface MeterPoint {
  timestamp: number;
  value: number;
}

async function listMeterDefinitions(token: string): Promise<MeterDefinition[]> {
  try {
    const url = `${env.API_URL}/apis/billing.miloapis.com/v1alpha1/meterdefinitions`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      items?: {
        metadata?: { uid?: string };
        spec?: {
          meterName?: string;
          displayName?: string;
          measurement?: { unit?: string };
        };
      }[];
    };
    return (json.items ?? [])
      .map((item) => ({
        meterApiName: item.metadata?.uid ?? '',
        meterName: item.spec?.meterName ?? '',
        displayName: item.spec?.displayName ?? item.spec?.meterName ?? '',
        unit: item.spec?.measurement?.unit,
      }))
      .filter((m) => m.meterApiName);
  } catch {
    return [];
  }
}

async function fetchMeterSeries(args: {
  meterApiName: string;
  customerIds: string[];
  startSec: number;
  endSec: number;
}): Promise<MeterPoint[]> {
  const apiKey = env.amberfloApiKey;
  if (!apiKey) return [];

  try {
    const resp = await fetch(`${env.amberfloBaseUrl}/usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        meterApiName: args.meterApiName,
        aggregation: 'sum',
        timeGroupingInterval: 'day',
        timeRange: {
          startTimeInSeconds: args.startSec,
          endTimeInSeconds: args.endSec,
        },
        filter: { customerId: args.customerIds },
        groupBy: ['customerId'],
      }),
    });
    if (!resp.ok) return [];

    const json = (await resp.json()) as {
      clientMeters?: { values?: { secondsSinceEpochUtc: number; value: number }[] }[];
    };
    const buckets = new Map<number, number>();
    for (const cm of json.clientMeters ?? []) {
      for (const v of cm.values ?? []) {
        buckets.set(v.secondsSinceEpochUtc, (buckets.get(v.secondsSinceEpochUtc) ?? 0) + v.value);
      }
    }
    const points = [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([ts, value]) => ({ timestamp: ts * 1000, value }));
    if (points.length > 0 && points.every((p) => p.value === 0)) return [];
    return points;
  } catch {
    return [];
  }
}

function sumSeries(values: MeterPoint[]): number {
  return values.reduce((acc, point) => acc + point.value, 0);
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
 * Amberflo credentials stay server-side.
 */
export async function loadOrgUsageSummary(
  orgName: string,
  token: string,
  cycleParam: string | null = 'current'
): Promise<OrgUsageSummary> {
  const fallbackCycle = buildBillingCycleWindows(undefined)[0];

  if (!env.amberfloApiKey) {
    return emptySummary('unconfigured', fallbackCycle, 'Usage metering is not configured.');
  }

  const orgNamespace = `organization-${orgName}`;
  const orgBaseURL = getOrgControlPlaneBaseURL(orgName);

  let accountsResp;
  try {
    accountsResp = await listBillingMiloapisComV1Alpha1NamespacedBillingAccount({
      baseURL: orgBaseURL,
      path: { namespace: orgNamespace },
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      return emptySummary(
        'insufficient-permissions',
        fallbackCycle,
        'Billing permissions are still being provisioned for this organization.'
      );
    }
    throw err;
  }

  const accounts = accountsResp.data as unknown as UnwrapProxyResponse<typeof accountsResp.data>;
  const items = accounts?.items ?? [];
  const ready = items.find((a) => a.status?.phase === 'Ready') ?? items[0] ?? undefined;
  const customerIds = items
    .map((a) => a.metadata?.uid)
    .filter((uid): uid is string => Boolean(uid));

  if (customerIds.length === 0) {
    return emptySummary(
      'no-billing-account',
      fallbackCycle,
      'This organization does not have a billing account.'
    );
  }

  const paymentTerms = ready?.spec?.paymentTerms as PaymentTermsInput | undefined;
  const cycle = selectBillingCycleWindow(buildBillingCycleWindows(paymentTerms), cycleParam);

  const meterDefs = await listMeterDefinitions(token);
  if (meterDefs.length === 0) {
    return emptySummary('no-meters', cycle, 'No MeterDefinitions were found for this environment.');
  }

  const [meterResults, costs] = await Promise.all([
    Promise.all(
      meterDefs.map(async (def): Promise<OrgUsageMeterSummary> => {
        const series = await fetchMeterSeries({
          meterApiName: def.meterApiName,
          customerIds,
          startSec: cycle.startSec,
          endSec: cycle.endSec,
        });
        return {
          meterApiName: def.meterApiName,
          label: def.displayName,
          unit: def.unit,
          used: sumSeries(series),
          limit: 0,
        };
      })
    ),
    fetchUsageCosts({
      customerIds,
      startSec: cycle.startSec,
      endSec: cycle.endSec,
    }),
  ]);

  const meters: OrgUsageMeterSummary[] = meterResults
    .map((meter) => {
      const spend = costs.byMeter.get(meter.meterApiName)?.spend;
      return spend === undefined ? meter : { ...meter, spend };
    })
    .filter((m) => m.used > 0)
    .sort((a, b) => b.used - a.used);

  return {
    status: 'ok',
    cycleLabel: cycle.label,
    cycleRangeLabel: cycle.rangeLabel,
    meters,
    totalSpend: costs.totalSpend,
    currencyCode: costs.currencyCode,
  };
}
