import { type EntityNav } from './nav-config';
import { usePlugins } from '@/modules/plugins/client/use-plugins';
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
 * unconditionally so per-entity injection (Phase 3) has a hook call already
 * in place to extend, with no conditional hook and no rules-of-hooks hazard.
 */
export function useEntityNav(): EntityNav | undefined {
  const matches = useMatches();
  // Unconditional per rules-of-hooks; unused until an entity nav actually
  // needs plugin-derived entries injected (see project's Compute tab, Phase 3).
  usePlugins();

  return useMemo(() => {
    const match = [...matches]
      .reverse()
      .find((m) => (m.handle as RouteHandleWithEntityNav | undefined)?.entityNav);
    if (!match) return undefined;
    const handle = match.handle as RouteHandleWithEntityNav;
    return handle.entityNav?.(match.data, match.params);
  }, [matches]);
}
