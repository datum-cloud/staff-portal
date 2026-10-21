/**
 * Adapter from the live `UsageFetchResult` into the view shapes the
 * dashboard components consume.
 */
import { aggregationQualifier, ucumToMeterUnit } from './usage.format';
import type {
  UsageGroupSection,
  UsageMeter,
  UsageProjectOption,
  UsageSummaryRow,
} from './usage.types';
import type { MeterSeries, UsageFetchResult, UsageSpend } from '@/modules/billing/usage.types';

/** `projectId` → `Project`; `region` → `Region`; `model_name` → `Model Name`. */
export function humanizeDimension(dimension: string): string {
  return dimension
    .replace(/\.?id$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

const PROJECT_BREAKDOWN_DIMENSION = 'project_name';

function projectDisplayName(
  projectName: string,
  projects: UsageProjectOption[] | undefined
): string {
  return projects?.find((project) => project.name === projectName)?.displayName ?? projectName;
}

function toUsageMeter(meter: MeterSeries, projects?: UsageProjectOption[]): UsageMeter {
  const breakdowns = (meter.breakdowns ?? [])
    .filter((b) => b.series.length > 0)
    .map((breakdown) =>
      breakdown.dimension === PROJECT_BREAKDOWN_DIMENSION
        ? {
            ...breakdown,
            series: breakdown.series.map((series) => ({
              ...series,
              groupValue: projectDisplayName(series.groupValue, projects),
            })),
          }
        : breakdown
    );
  const tabs = ['Total', ...breakdowns.map((b) => humanizeDimension(b.dimension))];

  return {
    id: meter.meterDefinition,
    apiName: meter.meterName ?? meter.meterDefinition,
    label: meter.label,
    description: meter.description ?? '',
    unit: ucumToMeterUnit(meter.unit),
    used: meter.total,
    limit: meter.limit ?? 0,
    qualifier: aggregationQualifier(meter.aggregation),
    spend: meter.spend,
    spendError: meter.spendError,
    tabs,
    series: meter.values,
    breakdowns,
  };
}

/** A meter recorded something in the period. */
function hasUsage(meter: UsageMeter): boolean {
  return meter.series.length > 0 || meter.used !== 0;
}

export interface UsageView {
  groups: UsageGroupSection[];
  summaryRows: UsageSummaryRow[];
  /** What all the usage costs together. */
  spend?: UsageSpend;
  /** Why `spend` is left out. */
  spendError?: string;
}

/** Build the dashboard view from live loader data. */
export function toUsageView(
  result: UsageFetchResult,
  projects?: UsageProjectOption[]
): UsageView | null {
  if (!result.groups?.length) return null;

  const meterByName = new Map(result.meters.map((m) => [m.meterDefinition, m]));

  const groups: UsageGroupSection[] = result.groups
    .map((group) => {
      const all = group.meterDefinitions
        .map((name) => meterByName.get(name))
        .filter((m): m is MeterSeries => Boolean(m))
        .map((meter) => toUsageMeter(meter, projects));
      return {
        id: group.id,
        title: group.title,
        description: `Metered consumption and spend for ${group.title} in the selected billing period.`,
        meters: all.filter(hasUsage),
        idleMeters: all.filter((meter) => !hasUsage(meter)),
      };
    })
    .filter((group) => group.meters.length > 0 || group.idleMeters.length > 0);

  if (!groups.some((group) => group.meters.length > 0)) return null;

  const summaryRows: UsageSummaryRow[] = groups.flatMap((group) =>
    group.meters.map((meter) => ({
      id: meter.id,
      apiName: meter.apiName,
      label: meter.label,
      unit: meter.unit,
      used: meter.used,
      limit: meter.limit,
      qualifier: meter.qualifier,
      spend: meter.spend,
      spendError: meter.spendError,
      series: meter.series,
      groupId: group.id,
      group: group.title,
    }))
  );

  return { groups, summaryRows, spend: result.spend, spendError: result.spendError };
}
