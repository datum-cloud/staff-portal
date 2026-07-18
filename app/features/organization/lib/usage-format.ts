export type MeterUnit = 'bytes' | 'duration' | 'count';

/**
 * Map a UCUM unit string from MeterDefinition onto display families.
 * Mirrors cloud-portal's usage.format.ts.
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

function formatBytes(bytes: number): string {
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

function formatDuration(seconds: number): string {
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
