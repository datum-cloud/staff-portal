const DISABLED_VALUES = new Set(['', 'false', '0']);

export function isWatchRequest(watch: string | undefined): boolean {
  return watch !== undefined && !DISABLED_VALUES.has(watch.toLowerCase());
}
