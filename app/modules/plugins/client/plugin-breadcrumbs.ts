/**
 * Breadcrumb trail for the project-scoped plugin mount
 * (`/customers/projects/:projectName/plugins/:slug/*`).
 *
 * The mount is one static route, so the router only knows "plugin". This
 * walks the splat one segment at a time and adds a crumb for every prefix
 * that is itself one of the plugin's `portal.page/project` paths. A plugin
 * declaring `:workloadName` and `:workloadName/instances/:instanceName` gets
 * `Workloads / my-workload / my-instance`; the literal `instances` segment
 * isn't a page, so it is skipped rather than linking to the plugin's 404.
 */
import { getProjectPageExtensions, matchPluginProjectPage } from './match-extension';
import type { BreadcrumbOptions } from '@/components/breadcrumb/breadcrumb-provider';
import type { PublicPlugin } from '@/modules/plugins/types';
import { projectRoutes } from '@/utils/config/routes.config';

export interface PluginBreadcrumbInput {
  plugin: Pick<PublicPlugin, 'displayName' | 'manifest'>;
  projectName: string;
  slug: string;
  splat?: string;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function pluginBreadcrumbs({
  plugin,
  projectName,
  slug,
  splat = '',
}: PluginBreadcrumbInput): BreadcrumbOptions[] {
  const items: BreadcrumbOptions[] = [
    { label: plugin.displayName, path: projectRoutes.plugin.mount(projectName, slug) },
  ];

  const pages = getProjectPageExtensions(plugin.manifest);
  const segments = splat.split('/').filter(Boolean);
  for (let i = 1; i <= segments.length; i++) {
    const prefix = segments.slice(0, i).join('/');
    if (!matchPluginProjectPage(pages, prefix)) continue;
    items.push({
      label: decodeSegment(segments[i - 1]),
      path: projectRoutes.plugin.page(projectName, slug, prefix),
    });
  }

  return items;
}
