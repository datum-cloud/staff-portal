import type { EffectiveTimeRange } from '@datum-cloud/activity-ui';

export type { EffectiveTimeRange };

export function generateShareableUrl(
  basePath: string,
  effectiveTimeRange: EffectiveTimeRange,
  filters: Record<string, string>,
  origin: string = typeof window !== 'undefined' ? window.location.origin : ''
): string {
  const params = new URLSearchParams();
  params.set('start', effectiveTimeRange.startTime);
  params.set('end', effectiveTimeRange.endTime);
  params.set('streaming', 'false');

  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== 'start' && key !== 'end' && key !== 'streaming') {
      params.set(key, value);
    }
  }

  return `${origin}${basePath}?${params.toString()}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
