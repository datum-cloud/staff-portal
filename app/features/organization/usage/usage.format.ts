import type { MeterUnit } from './usage.types';

/**
 * Map a UCUM unit string from `MeterDefinition.spec.measurement.unit`
 * onto the three display families this page formats.
 */
export function ucumToMeterUnit(unit: string | undefined): MeterUnit {
  if (!unit) return 'count';
  const u = unit.toLowerCase();
  if (u.includes('by')) return 'bytes';
  if (u === 's' || u === 'sec' || u === 'min' || u === 'h' || u === 'd' || u.endsWith('.s')) {
    return 'duration';
  }
  return 'count';
}

export function formatByUnit(unit: MeterUnit, value: number): string {
  switch (unit) {
    case 'bytes':
      return formatBytes(value);
    case 'duration':
      return formatDuration(value);
    default:
      return value.toLocaleString();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(seconds >= 600 ? 0 : 1)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(seconds >= 36000 ? 0 : 1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

/** `used / limit`, or just used when unlimited. */
export function formatUsagePair(unit: MeterUnit, used: number, limit: number): string {
  if (limit <= 0) return formatByUnit(unit, used);
  return `${formatByUnit(unit, used)} / ${formatByUnit(unit, limit)}`;
}

export function formatCurrency(amount: number | undefined, currencyCode = 'USD'): string {
  if (amount === undefined || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: amount >= 1 ? 2 : 4,
      maximumFractionDigits: amount >= 1 ? 2 : 6,
    }).format(amount);
  } catch {
    return `${amount.toFixed(4)} ${currencyCode}`;
  }
}

/** e.g. `$0.000003 / token` */
export function formatUnitRate(
  unitRate: number | undefined,
  unit: MeterUnit,
  currencyCode = 'USD',
  pricingUnit?: string
): string {
  if (unitRate === undefined || Number.isNaN(unitRate) || unitRate <= 0) return '—';
  const unitLabel =
    pricingUnit?.trim() || (unit === 'bytes' ? 'byte' : unit === 'duration' ? 'second' : 'unit');
  return `${formatCurrency(unitRate, currencyCode)} / ${unitLabel}`;
}
