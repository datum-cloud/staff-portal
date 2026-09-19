import { type EntityNav, type NavSubItem } from './nav-config';
import { usePlugins } from '@/modules/plugins/client/use-plugins';
import { findWorkloadListPluginSlug } from '@/modules/plugins/client/workload-plugin';
import { projectRoutes } from '@/utils/config/routes.config';
import { Boxes } from 'lucide-react';
import { useMemo } from 'react';
import { useMatches } from 'react-router';

/**
 * Route handle contract for an entity detail route (see `EntityNav` in
 * `nav-config.ts`). `handle` is module scope and cannot call hooks, so
 * `entityNav` is a plain function of the route's loader data and URL params
 * — both already resolved by the time `useMatches()` runs.
 */
export interface RouteHandleWithEntityNav {
  entityNav?: (data: any, params: Record<string, string | undefined>) => EntityNav;
}

/** `id` given to project's entity detail route in routes.ts — the one entity nav with a hook-derived entry. */
const PROJECT_ROUTE_ID = 'project-detail';

/**
 * Project's Compute tab only exists when an installed plugin serves a
 * Workloads list page (`findWorkloadListPluginSlug`, a client hook) — a
 * static `handle` can't build it. Splices it in right after Domains,
 * matching the tab order the pre-migration `EntityTab[]` used.
 */
function withProjectCompute(
  nav: EntityNav,
  projectName: string,
  workloadPluginSlug: string | null
): EntityNav {
  if (!workloadPluginSlug) return nav;

  const computeItem: NavSubItem = {
    label: 'Compute',
    icon: Boxes,
    match: projectRoutes.plugin.mount(projectName, workloadPluginSlug),
    children: [
      { label: 'Workloads', href: projectRoutes.plugin.mount(projectName, workloadPluginSlug) },
    ],
  };
  const domainsHref = projectRoutes.domain.list(projectName);

  return {
    ...nav,
    groups: nav.groups.map((group) => {
      const domainsIndex = group.items.findIndex((item) => item.href === domainsHref);
      if (domainsIndex === -1) return group;
      const items = [...group.items];
      items.splice(domainsIndex + 1, 0, computeItem);
      return { ...group, items };
    }),
  };
}

/**
 * Resolve the active route's entity nav, if any.
 *
 * Walks `useMatches()` in reverse (deepest match first) and returns the first
 * `handle.entityNav`, invoked with that match's loader data and params — a
 * nested entity route overrides its parent's entity nav. Returns `undefined`
 * off entity detail routes, so callers fall back to the section rail
 * (`section?.subNav`).
 *
 * Hook-derived entries (e.g. project's Compute tab, gated on
 * `findWorkloadListPluginSlug`) can't be built inside a `handle` — `handle`
 * is module scope and can't call hooks. Mirroring `useNavSections()`'s
 * `usePluginNavItems()` precedent, this hook calls `usePlugins()`
 * unconditionally so per-entity injection has a hook call already in place,
 * with no conditional hook and no rules-of-hooks hazard.
 */
export function useEntityNav(): EntityNav | undefined {
  const matches = useMatches();
  const { data: plugins = [] } = usePlugins();
  const workloadPluginSlug = useMemo(() => findWorkloadListPluginSlug(plugins), [plugins]);

  return useMemo(() => {
    const match = [...matches]
      .reverse()
      .find((m) => (m.handle as RouteHandleWithEntityNav | undefined)?.entityNav);
    if (!match) return undefined;
    const handle = match.handle as RouteHandleWithEntityNav;
    const nav = handle.entityNav?.(match.data, match.params);
    if (!nav) return undefined;

    if (match.id === PROJECT_ROUTE_ID) {
      const projectName = (match.params as Record<string, string | undefined>).projectName ?? '';
      return withProjectCompute(nav, projectName, workloadPluginSlug);
    }

    return nav;
  }, [matches, workloadPluginSlug]);
}
