import {
  buildBillingCycleWindows,
  selectBillingCycleWindow,
  type PaymentTermsInput,
} from './billing-cycle';
import {
  breakdownDimensions,
  breakdownDimensionsUnion,
  collectMeterResults,
  dayBuckets,
  planGroupings,
  toMeterSeries,
  toSpend,
} from './usage-query';
import type {
  MeterDefinition,
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
import {
  createUsageBillingMiloapisComV1Alpha1UsageQuery,
  type ComMiloapisGoBillingApiUsageV1Alpha1UsageQuerySpec as UsageQuerySpec,
  type ComMiloapisGoBillingApiUsageV1Alpha1UsageQueryStatus as UsageQueryStatus,
} from '@openapi/usage.billing.miloapis.com/v1alpha1';

const DEFAULT_DAYS = 30;

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

export async function resolveBillingAccountForUsageScope(
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

/** Phases `UsageQuery` reads; Draft and Retired meters are rejected. */
const QUERYABLE_METER_PHASES = new Set(['Published', 'Deprecated']);

// The meter catalog is platform-wide and rarely changes, so a short cache
// spares every dashboard load a round trip.
const METER_DEFINITIONS_TTL_MS = 60_000;
let meterDefinitionsCache: { expiresAt: number; defs: MeterDefinition[] } | undefined;

async function listMeterDefinitions(token: string): Promise<MeterDefinition[]> {
  if (meterDefinitionsCache && meterDefinitionsCache.expiresAt > Date.now()) {
    return meterDefinitionsCache.defs;
  }
  try {
    const url = `${env.API_URL}/apis/billing.miloapis.com/v1alpha1/meterdefinitions`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!resp.ok) {
      logger.warn('Failed to list MeterDefinitions for usage', { status: resp.status });
      return [];
    }
    const json = (await resp.json()) as {
      items?: {
        metadata?: { name?: string };
        spec?: {
          meterName?: string;
          displayName?: string;
          description?: string;
          phase?: string;
          measurement?: { unit?: string; aggregation?: string; dimensions?: string[] };
          monitoredResourceTypes?: string[];
        };
        status?: { systemDimensions?: string[] };
      }[];
    };
    const defs = (json.items ?? [])
      .filter((item) => QUERYABLE_METER_PHASES.has(item.spec?.phase ?? ''))
      .map((item) => ({
        name: item.metadata?.name ?? '',
        meterName: item.spec?.meterName ?? '',
        displayName: item.spec?.displayName ?? item.spec?.meterName ?? '',
        description: item.spec?.description?.trim() || undefined,
        unit: item.spec?.measurement?.unit,
        aggregation: item.spec?.measurement?.aggregation,
        dimensions: item.spec?.measurement?.dimensions ?? [],
        systemDimensions: item.status?.systemDimensions ?? [],
        monitoredResourceTypes: item.spec?.monitoredResourceTypes ?? [],
      }))
      .filter((m) => m.name && m.meterName);
    if (defs.length > 0) {
      meterDefinitionsCache = { expiresAt: Date.now() + METER_DEFINITIONS_TTL_MS, defs };
    }
    return defs;
  } catch (error) {
    // The definitions decide what is queried, so without them the page
    // shows no usage at all; make that visible.
    logger.warn('Failed to list MeterDefinitions for usage', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * POST a `UsageQuery` in the organization's context with the staff
 * member's token. Staff can read any organization's usage this way.
 */
async function queryUsage(
  orgName: string,
  token: string,
  spec: UsageQuerySpec
): Promise<UsageQueryStatus> {
  const resp = await createUsageBillingMiloapisComV1Alpha1UsageQuery({
    baseURL: getOrgControlPlaneBaseURL(orgName),
    // The generated SDK sends `*/*`; the API server wants JSON.
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: { apiVersion: 'usage.billing.miloapis.com/v1alpha1', kind: 'UsageQuery', spec },
  });
  const query = resp.data as unknown as UnwrapProxyResponse<typeof resp.data>;
  return query?.status ?? {};
}

/** Bucket meters by owning service group, preserving first-seen order. */
function buildUsageGroups(meters: MeterSeries[]): UsageGroup[] {
  const byId = new Map<string, UsageGroup>();
  for (const meter of meters) {
    const id = meter.groupId ?? 'other';
    const title = meter.groupTitle ?? 'Other';
    const group = byId.get(id) ?? { id, title, meterDefinitions: [] };
    group.meterDefinitions.push(meter.meterDefinition);
    byId.set(id, group);
  }
  return Array.from(byId.values());
}

/**
 * Read every meter's usage, with its total, per-dimension breakdowns and
 * spend, from `UsageQuery` in the organization's context. `projectId`
 * narrows it to one project with `spec.projects`.
 */
export async function fetchOrgUsage(
  orgName: string,
  token: string,
  options: {
    days?: number;
    range?: UsageTimeRange;
    projectId?: string;
    /** A catalog fetch already under way, so callers can overlap it with other work. */
    meterDefinitions?: Promise<MeterDefinition[]>;
  } = {}
): Promise<UsageFetchResult> {
  const { days = DEFAULT_DAYS, range, projectId } = options;
  const { startSec, endSec, days: resolvedDays } = resolveQueryTimeRange(days, range);
  // A project breakdown only makes sense across several projects.
  const includeProjectBreakdown = !projectId;

  const meterDefs = await (options.meterDefinitions ?? listMeterDefinitions(token));
  const groupingPlans = planGroupings(breakdownDimensionsUnion(meterDefs, includeProjectBreakdown));

  // `meters` is left empty so one query reads every meter, whatever its
  // dimensions. The first query also returns the total and the spend.
  const [primaryResult, ...overflowResults] = await Promise.allSettled(
    groupingPlans.map((dimensions, index) =>
      queryUsage(orgName, token, {
        startTime: new Date(startSec * 1000).toISOString(),
        endTime: new Date(endSec * 1000).toISOString(),
        granularity: 'Day',
        timeZone: 'UTC',
        projects: projectId ? [projectId] : undefined,
        includeSpend: index === 0 || undefined,
        groupings: [
          ...(index === 0 ? [{ groupBy: [] }] : []),
          ...dimensions.map((d) => ({ groupBy: [d] })),
        ],
      })
    )
  );

  if (primaryResult.status === 'rejected') {
    if (isAuthStatus(authStatusFromError(primaryResult.reason))) {
      return { status: 'insufficient-permissions', meters: [], days: resolvedDays, projectId };
    }
    throw primaryResult.reason;
  }
  const primary = primaryResult.value;

  // Overflow queries only carry extra breakdowns. If one fails, keep the
  // totals and spend on screen and lose just those tabs.
  const statuses: UsageQueryStatus[] = [primary];
  for (const result of overflowResults) {
    if (result.status === 'fulfilled') {
      statuses.push(result.value);
    } else {
      logger.warn('UsageQuery for extra breakdowns failed', {
        orgName,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  // Organization queries report the billing accounts they read; none means
  // the organization has no billing account yet.
  if (!primary.billingAccounts?.length) {
    return { status: 'no-billing-account', meters: [], days: resolvedDays, projectId };
  }

  const buckets = dayBuckets(startSec, endSec);
  const results = collectMeterResults(statuses);
  const meters = meterDefs.map((def) => {
    const result = results.get(def.name);
    if (result?.error) {
      // Not set up in the metering backend yet; it shows empty.
      logger.warn('UsageQuery could not read meter', {
        meterDefinition: def.name,
        error: result.error,
      });
    }
    return toMeterSeries(def, result, breakdownDimensions(def, includeProjectBreakdown), buckets);
  });
  if (primary.spendError) {
    logger.warn('UsageQuery could not total spend', { orgName, error: primary.spendError });
  }

  return {
    status: 'ok',
    meters,
    groups: buildUsageGroups(meters),
    days: resolvedDays,
    projectId,
    spend: toSpend(primary.spend),
    spendError: primary.spendError || undefined,
  };
}

function resolveUsageProjectSelection(projectParam: string | null | undefined): string {
  if (!projectParam || projectParam === 'all') return 'all';
  return projectParam;
}

/**
 * Resolve billing cycle windows and usage for the org usage dashboard.
 * Shared by the Hono API route and any server callers.
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

  // The catalog doesn't depend on the billing account; fetch both at once.
  const meterDefinitions = listMeterDefinitions(token);
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
    meterDefinitions,
  });

  return {
    usage,
    selectedProject,
    billingCycles,
    selectedBillingCycle,
  };
}
