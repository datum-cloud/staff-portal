import { NAV_SECTIONS, type NavSection, type NavSubItem } from './nav-config';
import { usePluginNavItems } from './use-plugin-nav-items';
import { useMemo } from 'react';
import { useLocation } from 'react-router';

/** Match length of a path prefix (or the best of several) against the pathname (0 = no match). */
function matchLength(pathname: string, prefix: string | string[]): number {
  if (Array.isArray(prefix)) {
    return prefix.reduce((best, p) => Math.max(best, matchLength(pathname, p)), 0);
  }
  if (pathname === prefix) return prefix.length;
  if (pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)) return prefix.length;
  return 0;
}

/** Pick the entry whose `match`/`href` prefix matches the pathname most specifically. */
function bestMatch<T extends { href: string; match?: string | string[] }>(
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
 * The full navbar section list: the static `NAV_SECTIONS` with any
 * plugin-contributed nav items (discovered at runtime via `usePlugins()`)
 * appended to the Operations section's sub-nav. Every platform-wide plugin
 * lands under Operations rather than minting its own top-level section, so
 * the navbar stays bounded regardless of plugin count. The one place both
 * regions (`MiloMainNav`, `MiloMobileMenu`) and `useActiveNav` read the
 * section list from, so plugin nav entries stay in sync everywhere.
 */
export function useNavSections(): NavSection[] {
  const pluginItems = usePluginNavItems();

  return useMemo(() => {
    if (pluginItems.length === 0) return NAV_SECTIONS;

    return NAV_SECTIONS.map((section) => {
      if (section.id !== 'operations' || !section.subNav) return section;

      const [firstGroup, ...restGroups] = section.subNav.groups;
      return {
        ...section,
        subNav: {
          ...section.subNav,
          groups: [{ ...firstGroup, items: [...firstGroup.items, ...pluginItems] }, ...restGroups],
        },
      };
    });
  }, [pluginItems]);
}

/**
 * Resolve which top section and sub-item are active from the current URL.
 * The single brain the shell regions read from — navbar highlights `section`,
 * the sub-nav rail highlights `subItem`, the context bar builds its segments
 * from both.
 */
export function useActiveNav(): ActiveNav {
  const { pathname } = useLocation();
  const sections = useNavSections();

  return useMemo(() => {
    // A section is active when the URL matches the section's own prefix OR any of
    // its sub-items — sub-items can live outside the section prefix (e.g. Contacts
    // → Lists at /contact-groups). Score each section by its best match across
    // both, and pick the strongest.
    let activeSection: NavSection | undefined;
    let bestLen = 0;
    for (const section of sections) {
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
  }, [pathname, sections]);
}
