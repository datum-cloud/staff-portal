import { NAV_SECTIONS, type NavSection, type NavSubItem } from './nav-config';
import { useMemo } from 'react';
import { useLocation } from 'react-router';

/** Match length of a path prefix against the current pathname (0 = no match). */
function matchLength(pathname: string, prefix: string): number {
  if (pathname === prefix) return prefix.length;
  if (pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)) return prefix.length;
  return 0;
}

/** Pick the entry whose `match`/`href` prefix matches the pathname most specifically. */
function bestMatch<T extends { href: string; match?: string }>(
  pathname: string,
  entries: T[]
): T | undefined {
  let best: T | undefined;
  let bestLen = 0;
  for (const entry of entries) {
    const len = matchLength(pathname, entry.match ?? entry.href);
    if (len > bestLen) {
      best = entry;
      bestLen = len;
    }
  }
  return best;
}

export interface ActiveNav {
  section?: NavSection;
  subItem?: NavSubItem;
}

/**
 * Resolve which top section and sub-item are active from the current URL.
 * The single brain the shell regions read from — navbar highlights `section`,
 * the sub-nav rail highlights `subItem`, the context bar builds its segments
 * from both.
 */
export function useActiveNav(): ActiveNav {
  const { pathname } = useLocation();

  return useMemo(() => {
    // A section is active when the URL matches the section's own prefix OR any of
    // its sub-items — sub-items can live outside the section prefix (e.g. Contacts
    // → Lists at /contact-groups). Score each section by its best match across
    // both, and pick the strongest.
    let activeSection: NavSection | undefined;
    let bestLen = 0;
    for (const section of NAV_SECTIONS) {
      const items = section.subNav?.groups.flatMap((g) => g.items) ?? [];
      const len = Math.max(
        matchLength(pathname, section.match ?? section.href),
        ...items.map((i) => matchLength(pathname, i.match ?? i.href))
      );
      if (len > bestLen) {
        activeSection = section;
        bestLen = len;
      }
    }

    if (!activeSection?.subNav) return { section: activeSection };

    const items = activeSection.subNav.groups.flatMap((g) => g.items);
    const subItem = bestMatch(pathname, items);
    return { section: activeSection, subItem };
  }, [pathname]);
}
