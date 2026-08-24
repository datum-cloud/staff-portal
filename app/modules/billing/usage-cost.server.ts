import type { MeterPoint } from './usage.types';
import { env } from '@/utils/config/env.server';
import { logger } from '@/utils/logger';

/** Platform dimension injected by the billing pipeline (not on MeterDefinition). */
const PROJECT_BREAKDOWN_DIMENSION = 'project_name';

interface AmberfloUsageCostValue {
  startTimeInSeconds?: number;
  meteredUnits?: number;
  price?: number;
}

interface AmberfloUsageGroupCost {
  groupInfos?: Record<string, string>;
  meteredUnits?: number;
  price?: number;
  costs?: AmberfloUsageCostValue[];
}

interface AmberfloUsageCostsResponse {
  costList?: AmberfloUsageGroupCost[];
}

export interface MeterCostData {
  /** Period spend in billing currency (from Amberflo). */
  spend: number;
  meteredUnits: number;
  /** Daily spend series aligned to the billing cycle. */
  costSeries: MeterPoint[];
  /** Current unit rate from Amberflo pricing, when available. */
  unitRate?: number;
}

export interface UsageCostSnapshot {
  byMeter: Map<string, MeterCostData>;
  totalSpend: number;
  currencyCode: string;
}

interface UsageCostQueryArgs {
  customerIds: string[];
  startSec: number;
  endSec: number;
  projectId?: string;
}

function emptySnapshot(): UsageCostSnapshot {
  return { byMeter: new Map(), totalSpend: 0, currencyCode: 'USD' };
}

function costValuesToSeries(costs: AmberfloUsageCostValue[] | undefined): MeterPoint[] {
  return (costs ?? [])
    .filter((entry) => typeof entry.startTimeInSeconds === 'number')
    .map((entry) => ({
      timestamp: entry.startTimeInSeconds! * 1000,
      value: entry.price ?? 0,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * POST Amberflo `/payments/cost/usage-cost` grouped by meter. Amberflo is
 * the source of truth for period spend and applied rates.
 */
export async function fetchUsageCosts(args: UsageCostQueryArgs): Promise<UsageCostSnapshot> {
  const apiKey = env.amberfloApiKey;
  if (!apiKey || args.customerIds.length === 0) {
    return emptySnapshot();
  }

  const filters: Record<string, string[]> = { customerId: args.customerIds };
  if (args.projectId) {
    filters[PROJECT_BREAKDOWN_DIMENSION] = [args.projectId];
  }

  try {
    const resp = await fetch(`${env.amberfloBaseUrl}/payments/cost/usage-cost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        timeRange: {
          startTimeInSeconds: args.startSec,
          endTimeInSeconds: args.endSec,
        },
        timeGroupingInterval: 'day',
        filters,
        groupBy: ['meterApiName'],
      }),
    });

    if (!resp.ok) {
      logger.warn('Amberflo usage-cost request failed', { status: resp.status });
      return emptySnapshot();
    }

    const json = (await resp.json()) as AmberfloUsageCostsResponse;
    const byMeter = new Map<string, MeterCostData>();
    let totalSpend = 0;

    for (const entry of json.costList ?? []) {
      const meterApiName = entry.groupInfos?.meterApiName;
      if (!meterApiName) continue;

      const spend = entry.price ?? 0;
      totalSpend += spend;
      byMeter.set(meterApiName, {
        spend,
        meteredUnits: entry.meteredUnits ?? 0,
        costSeries: costValuesToSeries(entry.costs),
      });
    }

    return { byMeter, totalSpend, currencyCode: 'USD' };
  } catch (error) {
    logger.warn('Failed to fetch Amberflo usage costs', { err: error });
    return emptySnapshot();
  }
}

/**
 * GET Amberflo `/usage/current-usage-rate` for the customer's active plan
 * rate on a meter. Best-effort — missing rates fall back to spend/units.
 */
export async function fetchCurrentUsageRate(
  meterApiName: string,
  customerId: string
): Promise<number | undefined> {
  const apiKey = env.amberfloApiKey;
  if (!apiKey || !meterApiName || !customerId) return undefined;

  try {
    const url = new URL(`${env.amberfloBaseUrl}/usage/current-usage-rate`);
    url.searchParams.set('meterApiName', meterApiName);
    url.searchParams.set('customerId', customerId);

    const resp = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
    });
    if (!resp.ok) return undefined;

    const json = (await resp.json()) as { rate?: number };
    return typeof json.rate === 'number' && json.rate >= 0 ? json.rate : undefined;
  } catch {
    return undefined;
  }
}

/** Attach plan unit rates for meters that have cost or usage in the period. */
export async function enrichMeterUnitRates(
  byMeter: Map<string, MeterCostData>,
  meterApiNames: string[],
  customerId: string
): Promise<void> {
  if (!env.amberfloApiKey || !customerId) return;

  await Promise.all(
    meterApiNames.map(async (meterApiName) => {
      const rate = await fetchCurrentUsageRate(meterApiName, customerId);
      if (rate === undefined) return;
      const existing = byMeter.get(meterApiName) ?? {
        spend: 0,
        meteredUnits: 0,
        costSeries: [],
      };
      byMeter.set(meterApiName, { ...existing, unitRate: rate });
    })
  );
}
