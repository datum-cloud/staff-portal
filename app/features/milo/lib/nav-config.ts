import { ENTITY_ICONS, SECTION_ICONS } from '@/utils/config/icons.config';
import {
  activityRoutes,
  billingAccountRoutes,
  contactGroupRoutes,
  contactRoutes,
  fraudRoutes,
  groupRoutes,
  orgRoutes,
  projectRoutes,
  resourceRoutes,
  routes,
  serviceCatalogRoutes,
  userRoutes,
} from '@/utils/config/routes.config';
import { type LucideIcon } from 'lucide-react';

/**
 * Single source of truth for the Milo shell navigation.
 *
 * Drives all three nav regions from one place: the top main menu (navbar), the
 * left sub-nav rail, and the context-bar breadcrumb roots. `use-active-section`
 * matches the current URL against `match` prefixes to decide what's active.
 *
 * A section with `subNav` renders the left rail; a section without it navigates
 * straight to `href` and the content spans full width.
 */

export interface NavSubItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  /** Prefix(es) for active detection; defaults to `href`. Array ⇒ active if any matches (e.g. Resources spanning /albs, /dns, /domains). */
  match?: string | string[];
  /** Optional count badge (shown when the rail is expanded). */
  count?: number;
}

export interface NavSubGroup {
  /** Optional group header (e.g. Inbox's "Views"); omit for an ungrouped list. */
  label?: string;
  items: NavSubItem[];
}

export interface NavSubNav {
  /** Icon-only rail by default; expands to labels + counts. */
  defaultCollapsed?: boolean;
  groups: NavSubGroup[];
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Where the top menu item navigates (a direct view, or the default child). */
  href: string;
  /** Path prefix for active detection; defaults to `href`. */
  match?: string;
  /** Present ⇒ left sub-nav rail shows; absent ⇒ direct link, no rail. */
  subNav?: NavSubNav;
  /**
   * When false, the top navbar item is a plain link (no hover dropdown), even
   * if `subNav` is present for the left rail. Defaults to true.
   */
  navbarDropdown?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'customers',
    label: 'Customers',
    icon: SECTION_ICONS.customers,
    href: orgRoutes.list(),
    match: '/customers',
    // Top nav goes straight to Organizations; children live in the left rail.
    navbarDropdown: false,
    subNav: {
      defaultCollapsed: true,
      groups: [
        {
          items: [
            { label: 'Organizations', href: orgRoutes.list(), icon: ENTITY_ICONS.organization },
            { label: 'Projects', href: projectRoutes.list(), icon: ENTITY_ICONS.project },
            // One "Resources" entry → a tabbed page (ALB / DNS / Domains),
            // all nested under /customers/resources.
            {
              label: 'Resources',
              href: resourceRoutes.root(),
              match: resourceRoutes.root(),
              icon: ENTITY_ICONS.resource,
            },
            { label: 'Users', href: userRoutes.list(), icon: ENTITY_ICONS.user },
            {
              label: 'Billing Accounts',
              href: billingAccountRoutes.list(),
              icon: ENTITY_ICONS.billingAccount,
            },
            { label: 'Fraud & Abuse', href: fraudRoutes.root(), icon: ENTITY_ICONS.fraud },
          ],
        },
      ],
    },
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: SECTION_ICONS.marketing,
    href: contactRoutes.list(),
    match: '/marketing',
    subNav: {
      defaultCollapsed: true,
      groups: [
        {
          items: [
            { label: 'Contacts', href: contactRoutes.list(), icon: ENTITY_ICONS.contact },
            {
              label: 'Contact Groups',
              href: contactGroupRoutes.list(),
              icon: ENTITY_ICONS.contactGroup,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: SECTION_ICONS.operations,
    href: activityRoutes.root(),
    match: '/operations',
    subNav: {
      defaultCollapsed: true,
      groups: [
        {
          items: [
            { label: 'Activity', href: activityRoutes.root(), icon: ENTITY_ICONS.activity },
            {
              label: 'Email Activity',
              href: routes.emailActivity(),
              icon: ENTITY_ICONS.emailActivity,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: SECTION_ICONS.admin,
    href: groupRoutes.list(),
    match: '/admin',
    subNav: {
      defaultCollapsed: true,
      groups: [
        {
          items: [
            { label: 'Groups', href: groupRoutes.list(), icon: ENTITY_ICONS.group },
            {
              label: 'Service Catalog',
              href: serviceCatalogRoutes.list(),
              icon: ENTITY_ICONS.serviceCatalog,
            },
          ],
        },
      ],
    },
  },
];
