import { type EntityNav, type NavSubNav } from './nav-config';
import { useActiveNav } from './use-active-section';
import { useEntityNav } from './use-entity-nav';
import { useMatches } from 'react-router';

/**
 * Route handle contract for a full-width list page. In a section whose
 * `subNav.placement` is `toolbar`, `fullWidth: true` drops the section rail
 * so the table spans the page; the list's search bar carries the section
 * switcher instead (`ListTable`, `SectionViewBar`). No effect on rail
 * sections or entity routes.
 */
export interface RouteHandleWithFullWidth {
  fullWidth?: boolean;
}

/**
 * What the left rail shows on the current route: the entity nav when the
 * route declares one, else the active section's `subNav` — except on a
 * toolbar section's full-width list pages, which get no rail. Every other
 * page in a section gets the section rail, so detail and create pages
 * without their own entity nav still have navigation.
 */
export function useRailNav(): NavSubNav | EntityNav | undefined {
  const { section } = useActiveNav();
  const entityNav = useEntityNav();
  const matches = useMatches();

  if (entityNav) return entityNav;

  const subNav = section?.subNav;
  if (!subNav) return undefined;

  const fullWidth = matches.some(
    (m) => (m.handle as RouteHandleWithFullWidth | undefined)?.fullWidth
  );
  return subNav.placement === 'toolbar' && fullWidth ? undefined : subNav;
}
