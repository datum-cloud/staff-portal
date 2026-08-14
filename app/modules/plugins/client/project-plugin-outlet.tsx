/**
 * `<ProjectPluginOutlet>` — project-scoped counterpart to `PluginOutlet`.
 * Renders a plugin's `portal.page/project` extensions instead of its
 * `portal.page/platform` ones, via the same {@link PluginPageOutlet} render
 * surface. Mounted under `/customers/projects/:projectName/plugins/:slug/*`,
 * so `projectName` is already resolved by the ancestor route match —
 * `useParams()` inside a plugin page merges that ancestor param with
 * whatever the plugin's own declared path adds (e.g. `:workloadName`), with
 * no extra prop/context passthrough needed.
 */
import { getProjectPageExtensions } from './match-extension';
import { PluginPageOutlet } from './plugin-page-outlet';
import type { PublicPlugin } from '@/modules/plugins/types';
import { useMemo } from 'react';

export function ProjectPluginOutlet({ plugin }: { plugin: PublicPlugin }) {
  const pages = useMemo(() => getProjectPageExtensions(plugin.manifest), [plugin.manifest]);
  return <PluginPageOutlet plugin={plugin} pages={pages} />;
}
