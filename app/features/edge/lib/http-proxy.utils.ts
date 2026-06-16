import type { HttpProxy } from './http-proxy.types';

export function getParanoiaLevelLabel(level?: number): string {
  switch (level) {
    case 1:
      return 'Relaxed';
    case 2:
      return 'Balanced';
    case 3:
      return 'Strict';
    case 4:
      return 'Maximum';
    default:
      return 'Relaxed';
  }
}

export function formatWafProtectionDisplay(httpProxy: HttpProxy): string {
  const mode = httpProxy.trafficProtectionMode || 'Disabled';
  if (mode === 'Disabled') return 'Disabled';
  const blocking = httpProxy.paranoiaLevels?.blocking ?? 1;
  const levelLabel = getParanoiaLevelLabel(blocking);
  return `${mode} · ${levelLabel}`;
}
