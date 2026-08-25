/**
 * `<PluginOutlet>` — the client render surface of the platform-scoped plugin
 * mount. Ported from cloud-portal, simplified: no route-param passthrough is
 * needed (the mount is platform-scoped, not nested under `:projectId`/
 * `:orgName`).
 *
 * Given a plugin resolved by the mount route, it renders the plugin's pages
 * (`portal.page/platform` extensions) through {@link PluginPageOutlet} —
 * because react-router is a host-pinned shared singleton, this makes
 * `useParams`, `Link`, and `useNavigate` behave identically inside plugin
 * pages, including the plugin's own `:params`, which the host's flat
 * catch-all mount route cannot express.
 */
import { getPageExtensions } from './match-extension';
import { PluginPageOutlet } from './plugin-page-outlet';
import type { PublicPlugin } from '@/modules/plugins/types';
import { useMemo } from 'react';

export function PluginOutlet({ plugin }: { plugin: PublicPlugin }) {
  const pages = useMemo(() => getPageExtensions(plugin.manifest), [plugin.manifest]);
  return <PluginPageOutlet plugin={plugin} pages={pages} />;
}
