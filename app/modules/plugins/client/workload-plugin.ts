/**
 * Small shared helper for the one thing both `/customers/resources` (the
 * detail link on a Workload row) and the project detail nav (the "Compute"
 * tab) need to agree on: which installed plugin, if any, actually serves
 * compute Workloads.
 */
import {
  getProjectPageExtensions,
  getResourceExtensions,
  normalizePagePath,
} from './match-extension';
import type { PublicPlugin } from '@/modules/plugins/types';

/** The `type` key compute's provider plugin declares on its `portal.resource/platform` extension. */
export const WORKLOAD_RESOURCE_TYPE = 'workload';

/**
 * Finds the registered slug of the installed plugin that declares both the
 * `workload` resource extension AND a project-page index (list) extension —
 * i.e. the plugin whose Workloads list page actually exists to link to.
 * Returns `null` if no such plugin is installed/reachable, or if a workload
 * plugin exists but hasn't (yet) declared a list page — callers should
 * degrade to omitting whatever UI they'd have shown rather than linking to a
 * dead end.
 */
export function findWorkloadListPluginSlug(plugins: PublicPlugin[]): string | null {
  for (const plugin of plugins) {
    const hasWorkloadResource = getResourceExtensions(plugin.manifest).some(
      (ext) => ext.properties.type === WORKLOAD_RESOURCE_TYPE
    );
    if (!hasWorkloadResource) continue;

    const hasListPage = getProjectPageExtensions(plugin.manifest).some(
      (ext) => normalizePagePath(ext.properties.path) === ''
    );
    if (hasListPage) return plugin.slug;
  }
  return null;
}
