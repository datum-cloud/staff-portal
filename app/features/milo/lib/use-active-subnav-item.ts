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

/**
 * The rail's navigable targets: top-level leaf items, plus every group's
 * children (each tagged with its parent — D1 is single-level nesting). A group
 * header that has `children` is deliberately NOT a target of its own: you
 * navigate to a child, never to the header, so it's excluded as a match
 * candidate and instead becomes active via whichever child matches. That's
 * what makes a group-root URL — where the header's `match` equals its first
 * child's `href` (Compute/Workloads, Activity/Feed) — resolve to that child,
 * so the group highlights and auto-expands rather than matching the
 * non-highlightable header and leaving nothing active.
 */
function navigableTargets(items: NavSubItem[]): { item: NavSubItem; parent?: NavSubItem }[] {
  return items.flatMap((item) =>
    item.children?.length
      ? item.children.map((child) => ({ item: child, parent: item }))
      : [{ item }]
  );
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
    const candidates = navigableTargets(groups.flatMap((g) => g.items));

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
