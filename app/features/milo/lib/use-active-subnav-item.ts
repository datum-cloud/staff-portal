import { type NavSubGroup, type NavSubItem } from './nav-config';
import { matchLength } from './use-active-section';
import { useMemo } from 'react';
import { useLocation } from 'react-router';

export interface ActiveSubNavItem {
  /** The most specific matching item — a child, when a child matched more specifically than its parent (D1). */
  item?: NavSubItem;
  /** Set when `item` is a child — its top-level entry, so that group auto-expands. */
  parent?: NavSubItem;
}

/** One level of `children` flattened into standalone candidates, each tagged with its parent (D1 is single-level nesting). */
function flatten(items: NavSubItem[]): { item: NavSubItem; parent?: NavSubItem }[] {
  return items.flatMap((item) => [
    { item },
    ...(item.children ?? []).map((child) => ({ item: child, parent: item })),
  ]);
}

/**
 * Resolve which sub-nav item (and, if nested, its parent) is active for the
 * current URL. Same longest-prefix-wins algorithm as `useActiveNav`'s section
 * sub-items, extended one level deep for D1's collapsible groups
 * (Resources/Activity/Quotas/Compute) — a rail renders either a section's
 * `NavSubNav` or an entity's `EntityNav`, both of which share `NavSubGroup[]`,
 * so one hook serves both.
 */
export function useActiveSubNavItem(groups: NavSubGroup[]): ActiveSubNavItem {
  const { pathname } = useLocation();

  return useMemo(() => {
    const candidates = flatten(groups.flatMap((g) => g.items));

    let best: (typeof candidates)[number] | undefined;
    let bestLen = 0;
    for (const candidate of candidates) {
      const prefix = candidate.item.match ?? candidate.item.href;
      if (!prefix) continue;
      const len = matchLength(pathname, prefix);
      if (len > bestLen) {
        best = candidate;
        bestLen = len;
      }
    }

    return { item: best?.item, parent: best?.parent };
  }, [groups, pathname]);
}
