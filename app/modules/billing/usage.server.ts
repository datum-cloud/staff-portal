import {
  buildBillingCycleWindows,
  selectBillingCycleWindow,
  type PaymentTermsInput,
} from './billing-cycle';
import { enrichMeterUnitRates, fetchUsageCosts } from './usage-cost.server';
import type {
  MeterBreakdownSeries,
  MeterDefinition,
  MeterPoint,
  MeterSeries,
  OrgUsageDashboardData,
  UsageFetchResult,
  UsageGroup,
} from './usage.types';
import { getOrgControlPlaneBaseURL } from '@/resources/request/client/apis/control-plane';
import { env } from '@/utils/config/env.server';
import { logger } from '@/utils/logger';
import {
  listBillingMiloapisComV1Alpha1NamespacedBillingAccount,
  listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding,
  readBillingMiloapisComV1Alpha1NamespacedBillingAccount,
} from '@openapi/billing.miloapis.com/v1alpha1';
import type { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

const DEFAULT_DAYS = 30;
const MAX_BREAKDOWN_DIMENSIONS = 3;
/** Platform dimension injected by the billing pipeline (not on MeterDefinition). */
const PROJECT_BREAKDOWN_DIMENSION = 'project_name';

export interface UsageTimeRange {
  startSec: number;
  endSec: number;
}

function resolveQueryTimeRange(
  days = DEFAULT_DAYS,
  range?: UsageTimeRange
): { startSec: number; endSec: number; days: number } {
  const nowSec = Math.floor(Date.now() / 1000);
  if (range) {
    const spanDays = Math.max(1, Math.ceil((range.endSec - range.startSec) / 86400));
    return { startSec: range.startSec, endSec: range.endSec, days: spanDays };
  }
  return { startSec: nowSec - days * 24 * 3600, endSec: nowSec, days };
}

function orgNamespace(orgName: string) {
  return `organization-${orgName}`;
}

function isAuthStatus(status: number | undefined): boolean {
  return status === 401 || status === 403;
}

function authStatusFromError(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

/**
 * Billing account whose `paymentTerms` drive the cycle picker. Project
 * scope uses the bound account; org scope uses the first Ready account
 * (falling back to the first account when none are Ready yet).
 */
async function resolveBillingAccountForUsageScope(
  orgName: string,
  token: string,
  projectId: string | 'all'
): Promise<{
  name?: string;
  uid?: string;
  paymentTerms?: PaymentTermsInput;
} | null> {
  const baseURL = getOrgControlPlaneBaseURL(orgName);
  const namespace = orgNamespace(orgName);

  if (projectId !== 'all') {
    let bindings;
    try {
      const resp = await listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding({
        baseURL,
        path: { namespace },
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = resp.data as unknown as UnwrapProxyResponse<typeof resp.data>;
      bindings = data?.items ?? [];
    } catch {
      return null;
    }

    const binding = bindings.find(
      (b) =>
        b.spec?.projectRef?.name === projectId && (!b.status?.phase || b.status.phase === 'Active')
    );
    const accountName = binding?.spec?.billingAccountRef?.name;
    if (!accountName) return null;

    try {
      const resp = await readBillingMiloapisComV1Alpha1NamespacedBillingAccount({
        baseURL,
        path: { namespace, name: accountName },
        headers: { Authorization: `Bearer ${token}` },
      });
      const account = resp.data as unknown as UnwrapProxyResponse<typeof resp.data>;
      return {
        name: account?.metadata?.name,
        uid: account?.metadata?.uid,
        paymentTerms: account?.spec?.paymentTerms as PaymentTermsInput | undefined,
      };
    } catch {
      return null;
    }
  }

  try {
    const resp = await listBillingMiloapisComV1Alpha1NamespacedBillingAccount({
      baseURL,
      path: { namespace },
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = resp.data as unknown as UnwrapProxyResponse<typeof resp.data>;
    const accounts = data?.items ?? [];
    const ready = accounts.find((a) => a.status?.phase === 'Ready') ?? accounts[0];
    if (!ready) return null;
    return {
      name: ready.metadata?.name,
      uid: ready.metadata?.uid,
      paymentTerms: ready.spec?.paymentTerms as PaymentTermsInput | undefined,
    };
  } catch {
    return null;
  }
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
          description?: string;
          measurement?: { unit?: string; aggregation?: string; dimensions?: string[] };
          monitoredResourceTypes?: string[];
        };
      }[];
    };
    return (json.items ?? [])
      .map((item) => ({
        meterApiName: item.metadata?.uid ?? '',
        meterName: item.spec?.meterName ?? '',
        displayName: item.spec?.displayName ?? item.spec?.meterName ?? '',
        description: item.spec?.description?.trim() || undefined,
        unit: item.spec?.measurement?.unit,
        aggregation: item.spec?.measurement?.aggregation,
        dimensions: item.spec?.measurement?.dimensions ?? [],
        monitoredResourceTypes: item.spec?.monitoredResourceTypes ?? [],
      }))
      .filter((m) => m.meterApiName && m.meterName);
  } catch {
    return [];
  }
}

/**
 * Reverse-DNS service domain that owns a meter, e.g.
 * `assistant.miloapis.com/conversation/input-tokens` → `assistant.miloapis.com`.
 */
function serviceDomainFromMeterName(meterName: string): string {
  const slash = meterName.indexOf('/');
  return slash > 0 ? meterName.slice(0, slash) : meterName;
}

/** `compute.miloapis.com` → `Compute`; `ai-gateway.x` → `Ai Gateway`. */
function humanizeServiceGroup(domain: string): string {
  const label = domain.split('.')[0] ?? domain;
  return label
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function resolveMeterGroup(def: MeterDefinition): { id: string; title: string } {
  const domain = serviceDomainFromMeterName(def.meterName);
  return { id: domain, title: humanizeServiceGroup(domain) };
}

interface SparseClientMeter {
  values?: { secondsSinceEpochUtc: number; value: number }[];
  group?: { groupInfo?: Record<string, string> };
  groupInfo?: Record<string, string>;
  groupColumns?: Record<string, string>;
}

function resolveGroupInfo(cm: SparseClientMeter): Record<string, string> {
  return cm.group?.groupInfo ?? cm.groupInfo ?? cm.groupColumns ?? {};
}

function clientMeterToPoints(cm: SparseClientMeter | undefined): MeterPoint[] {
  return (cm?.values ?? []).map((v) => ({
    timestamp: v.secondsSinceEpochUtc * 1000,
    value: v.value,
  }));
}

function aggregateMeterValues(clientMeters: SparseClientMeter[] | undefined): MeterPoint[] {
  const totalsByTs = new Map<number, number>();
  for (const cm of clientMeters ?? []) {
    for (const v of cm.values ?? []) {
      const ts = v.secondsSinceEpochUtc * 1000;
      totalsByTs.set(ts, (totalsByTs.get(ts) ?? 0) + v.value);
    }
  }
  const points = Array.from(totalsByTs.entries())
    .map(([timestamp, value]) => ({ timestamp, value }))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (points.length > 0 && points.every((point) => point.value === 0)) {
    return [];
  }
  return points;
}

interface UsageQueryArgs {
  meterApiName: string;
  customerIds: string[];
  startSec: number;
  nowSec: number;
  apiKey: string;
  baseUrl: string;
  projectId?: string;
}

/**
 * POST Amberflo `/usage` (daily-aggregated series). Same endpoint as
 * {@link loadOrgUsageSummary}; `/usage/sparse` returns empty for
 * pre-aggregated meters.
 */
async function queryUsage(args: UsageQueryArgs, groupBy: string[]): Promise<SparseClientMeter[]> {
  const { meterApiName, customerIds, startSec, nowSec, apiKey, baseUrl, projectId } = args;
  const filter: Record<string, string[]> = { customerId: customerIds };
  if (projectId) {
    filter[PROJECT_BREAKDOWN_DIMENSION] = [projectId];
  }
  const resp = await fetch(`${baseUrl}/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      meterApiName,
      aggregation: 'sum',
      timeGroupingInterval: 'day',
      timeRange: { startTimeInSeconds: startSec, endTimeInSeconds: nowSec },
      filter,
      groupBy,
    }),
  });
  if (!resp.ok) return [];
  const json = (await resp.json()) as { clientMeters?: SparseClientMeter[] };
  return json.clientMeters ?? [];
}

async function fetchAggregateSeries(args: UsageQueryArgs): Promise<MeterPoint[]> {
  return aggregateMeterValues(await queryUsage(args, ['customerId']));
}

async function fetchMeterBreakdown(
  args: UsageQueryArgs,
  dimension: string
): Promise<MeterBreakdownSeries[]> {
  const clientMeters = await queryUsage(args, [dimension]);
  const pointsByGroup = new Map<string, Map<number, number>>();

  for (const cm of clientMeters) {
    const groupInfo = resolveGroupInfo(cm);
    const groupValue = groupInfo[dimension];
    if (!groupValue) continue;

    const byTimestamp = pointsByGroup.get(groupValue) ?? new Map<number, number>();
    for (const point of clientMeterToPoints(cm)) {
      byTimestamp.set(point.timestamp, (byTimestamp.get(point.timestamp) ?? 0) + point.value);
    }
    pointsByGroup.set(groupValue, byTimestamp);
  }

  return [...pointsByGroup.entries()]
    .map(([groupValue, byTimestamp]) => {
      const values = [...byTimestamp.entries()]
        .map(([timestamp, value]) => ({ timestamp, value }))
        .sort((a, b) => a.timestamp - b.timestamp);
      const total = values.reduce((acc, point) => acc + point.value, 0);
      return { groupValue, values: total === 0 ? [] : values };
    })
    .filter((series) => series.values.length > 0);
}

async function fetchUsageForCustomerIds({
  customerIds,
  days = DEFAULT_DAYS,
  range,
  projectId,
  token,
}: {
  customerIds: string[];
  days?: number;
  range?: UsageTimeRange;
  projectId?: string;
  token: string;
}): Promise<MeterSeries[]> {
  const apiKey = env.amberfloApiKey;
  if (!apiKey || customerIds.length === 0) {
    return [];
  }

  const baseUrl = env.amberfloBaseUrl;
  const { startSec, endSec: nowSec } = resolveQueryTimeRange(days, range);
  const meterDefs = await listMeterDefinitions(token);

  return Promise.all(
    meterDefs.map(async (def): Promise<MeterSeries> => {
      const group = resolveMeterGroup(def);
      const base: MeterSeries = {
        meterApiName: def.meterApiName,
        meterName: def.meterName,
        label: def.displayName,
        values: [],
        description: def.description,
        unit: def.unit,
        aggregation: def.aggregation,
        dimensions: def.dimensions,
        groupId: group.id,
        groupTitle: group.title,
      };

      const queryArgs: UsageQueryArgs = {
        meterApiName: def.meterApiName,
        customerIds,
        startSec,
        nowSec,
        apiKey,
        baseUrl,
        projectId,
      };

      try {
        const dims = (def.dimensions ?? []).slice(0, MAX_BREAKDOWN_DIMENSIONS);
        const [values, meterBreakdowns, projectBreakdown] = await Promise.all([
          fetchAggregateSeries(queryArgs),
          Promise.all(
            dims.map(async (dimension) => ({
              dimension,
              series: await fetchMeterBreakdown(queryArgs, dimension),
            }))
          ),
          projectId
            ? Promise.resolve({
                dimension: PROJECT_BREAKDOWN_DIMENSION,
                series: [] as MeterBreakdownSeries[],
              })
            : fetchMeterBreakdown(queryArgs, PROJECT_BREAKDOWN_DIMENSION).then((series) => ({
                dimension: PROJECT_BREAKDOWN_DIMENSION,
                series,
              })),
        ]);
        const breakdowns = [
          ...(projectBreakdown.series.length > 0 ? [projectBreakdown] : []),
          ...meterBreakdowns.filter((b) => b.series.length > 0),
        ];
        return { ...base, values, breakdowns };
      } catch (error) {
        logger.warn('Failed to fetch meter usage series', {
          err: error,
          meter: def.meterApiName,
        });
        return base;
      }
    })
  );
}

function buildUsageGroups(meters: MeterSeries[]): UsageGroup[] {
  const byId = new Map<string, UsageGroup>();
  for (const meter of meters) {
    const id = meter.groupId ?? 'other';
    const title = meter.groupTitle ?? 'Other';
    const group = byId.get(id) ?? { id, title, meterApiNames: [] };
    group.meterApiNames.push(meter.meterApiName);
    byId.set(id, group);
  }
  return Array.from(byId.values());
}

async function resolveProjectCustomerId(
  orgName: string,
  token: string,
  projectId: string
): Promise<
  | { status: 'ok'; customerId: string }
  | { status: 'no-billing-account' | 'insufficient-permissions' }
> {
  const account = await resolveBillingAccountForUsageScope(orgName, token, projectId).catch(
    (err) => {
      if (isAuthStatus(authStatusFromError(err))) {
        return 'auth' as const;
      }
      throw err;
    }
  );

  if (account === 'auth') {
    return { status: 'insufficient-permissions' };
  }
  if (!account?.uid) {
    return { status: 'no-billing-account' };
  }
  return { status: 'ok', customerId: account.uid };
}

async function fetchOrgUsage(
  orgName: string,
  token: string,
  options: { days?: number; range?: UsageTimeRange; projectId?: string } = {}
): Promise<UsageFetchResult> {
  const { days = DEFAULT_DAYS, range, projectId } = options;
  const { days: resolvedDays } = resolveQueryTimeRange(days, range);

  if (!env.amberfloApiKey) {
    return { status: 'unconfigured', meters: [], days: resolvedDays, projectId };
  }

  let customerIds: string[];
  if (projectId) {
    const resolved = await resolveProjectCustomerId(orgName, token, projectId);
    if (resolved.status !== 'ok') {
      return { status: resolved.status, meters: [], days: resolvedDays, projectId };
    }
    customerIds = [resolved.customerId];
  } else {
    const baseURL = getOrgControlPlaneBaseURL(orgName);
    let accounts;
    try {
      const resp = await listBillingMiloapisComV1Alpha1NamespacedBillingAccount({
        baseURL,
        path: { namespace: orgNamespace(orgName) },
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = resp.data as unknown as UnwrapProxyResponse<typeof resp.data>;
      accounts = data?.items ?? [];
    } catch (err) {
      if (isAuthStatus(authStatusFromError(err))) {
        return { status: 'insufficient-permissions', meters: [], days: resolvedDays };
      }
      throw err;
    }

    customerIds = [
      ...new Set(
        accounts
          .map((account) => account.metadata?.uid)
          .filter((uid): uid is string => Boolean(uid))
      ),
    ];

    if (customerIds.length === 0) {
      return { status: 'no-billing-account', meters: [], days: resolvedDays };
    }
  }

  const { startSec, endSec: nowSec } = resolveQueryTimeRange(days, range);

  const [meters, costs] = await Promise.all([
    fetchUsageForCustomerIds({
      customerIds,
      days,
      range,
      projectId,
      token,
    }),
    fetchUsageCosts({
      customerIds,
      startSec,
      endSec: nowSec,
      projectId,
    }),
  ]);

  const rateCustomerId = customerIds[0];
  const metersWithCost = meters.map((meter) => {
    const cost = costs.byMeter.get(meter.meterApiName);
    if (!cost) return meter;
    const unitRate =
      cost.unitRate ??
      (cost.meteredUnits > 0 && cost.spend > 0 ? cost.spend / cost.meteredUnits : undefined);
    return {
      ...meter,
      spend: cost.spend,
      unitRate,
      costSeries: cost.costSeries,
    };
  });

  const metersNeedingRates = metersWithCost
    .filter((meter) => {
      if (meter.unitRate !== undefined) return false;
      const used = meter.used ?? meter.values.reduce((total, point) => total + point.value, 0);
      return used > 0 || (meter.spend ?? 0) > 0;
    })
    .map((meter) => meter.meterApiName);

  if (rateCustomerId && metersNeedingRates.length > 0) {
    await enrichMeterUnitRates(costs.byMeter, metersNeedingRates, rateCustomerId);
    for (const meter of metersWithCost) {
      const enriched = costs.byMeter.get(meter.meterApiName);
      if (enriched?.unitRate !== undefined && meter.unitRate === undefined) {
        meter.unitRate = enriched.unitRate;
      }
    }
  }

  return {
    status: 'ok',
    meters: metersWithCost,
    groups: buildUsageGroups(metersWithCost),
    days: resolvedDays,
    projectId,
    totalSpend: costs.totalSpend,
    currencyCode: costs.currencyCode,
  };
}

function resolveUsageProjectSelection(projectParam: string | null | undefined): string {
  if (!projectParam || projectParam === 'all') return 'all';
  return projectParam;
}

/**
 * Resolve billing cycle windows and Amberflo usage for the org usage
 * dashboard. Shared by the Hono API route and any server callers.
 */
export async function loadOrgUsageDashboard(
  orgName: string,
  token: string,
  options: {
    projectParam?: string | null;
    cycleParam?: string | null;
  } = {}
): Promise<OrgUsageDashboardData> {
  const { projectParam, cycleParam } = options;
  const selectedProject = resolveUsageProjectSelection(projectParam);

  const scopedBillingAccount = await resolveBillingAccountForUsageScope(
    orgName,
    token,
    selectedProject
  ).catch(() => null);

  const cycleWindows = buildBillingCycleWindows(scopedBillingAccount?.paymentTerms);
  const selectedCycleWindow = selectBillingCycleWindow(cycleWindows, cycleParam);
  const selectedBillingCycle = selectedCycleWindow.value;
  const billingCycles = cycleWindows.map((window) => ({
    value: window.value,
    label: window.label,
  }));
  const range = { startSec: selectedCycleWindow.startSec, endSec: selectedCycleWindow.endSec };

  const usage = await fetchOrgUsage(orgName, token, {
    range,
    projectId: selectedProject === 'all' ? undefined : selectedProject,
  });

  return {
    usage,
    selectedProject,
    billingCycles,
    selectedBillingCycle,
  };
}
