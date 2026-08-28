/**
 * `<ServicePluginOutlet>` — service-scoped counterpart to `PluginOutlet`.
 * Renders a plugin's `portal.page/service` extensions instead of its
 * `portal.page/platform` ones, via the same {@link PluginPageOutlet} render
 * surface. Mounted under
 * `/admin/service-catalog/:name/plugins/:slug/*`, so `name` (the Service's
 * resource name) is already resolved by the ancestor route match.
 *
 * Excludes `path: ""` extensions — those are the reserved "replace the
 * built-in Overview" convention (see `PageServiceExtension` in `../types.ts`)
 * and are already rendered once, at `/admin/service-catalog/:name` itself,
 * by `ServiceOverviewOverride`. Passing one through to `PluginPageOutlet`
 * here would map it to an index route and render it a second time at this
 * mount's own bare URL (`/admin/service-catalog/:name/plugins/:slug`) —
 * the same filter `layout.tsx` applies when building the tab strip.
 */
import { getServicePageExtensions, isOverviewOverrideExtension } from './match-extension';
import { PluginPageOutlet } from './plugin-page-outlet';
import type { PublicPlugin } from '@/modules/plugins/types';
import { useMemo } from 'react';

export function ServicePluginOutlet({ plugin }: { plugin: PublicPlugin }) {
  const pages = useMemo(
    () =>
      getServicePageExtensions(plugin.manifest).filter((ext) => !isOverviewOverrideExtension(ext)),
    [plugin.manifest]
  );
  return <PluginPageOutlet plugin={plugin} pages={pages} />;
}
