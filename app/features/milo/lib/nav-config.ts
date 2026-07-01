import {
  activityRoutes,
  contactRoutes,
  dnsRoutes,
  domainRoutes,
  edgeRoutes,
  financeRoutes,
  groupRoutes,
  orgRoutes,
  projectRoutes,
  serviceCatalogRoutes,
  userRoutes,
} from '@/utils/config/routes.config';
import {
  Cog,
  Contact,
  CreditCard,
  Folders,
  Gauge,
  Layers,
  type LucideIcon,
  Megaphone,
  Shield,
  ShieldUser,
  Signpost,
  SquareActivity,
  Store,
  Users,
} from 'lucide-react';

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
  /** Longest-prefix match for active detection; defaults to `href`. */
  match?: string;
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
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    href: orgRoutes.list(),
    match: '/customers',
    subNav: {
      defaultCollapsed: true,
      groups: [
        {
          items: [
            { label: 'Organizations', href: orgRoutes.list(), icon: Users },
            { label: 'Projects', href: projectRoutes.list(), icon: Folders },
            // Interim: AI Edge / DNS / Domains will consolidate into a tabbed
            // "Resources" page (a follow-up build); listed individually for now.
            { label: 'AI Edge', href: edgeRoutes.list(), icon: Gauge },
            { label: 'DNS', href: dnsRoutes.list(), icon: Signpost },
            { label: 'Domains', href: domainRoutes.list(), icon: Layers },
            { label: 'Users', href: userRoutes.list(), icon: Contact },
          ],
        },
      ],
    },
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    href: contactRoutes.list(),
    match: '/contacts',
    subNav: {
      defaultCollapsed: true,
      groups: [{ items: [{ label: 'Contacts', href: contactRoutes.list(), icon: Contact }] }],
    },
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: CreditCard,
    href: financeRoutes.billingAccounts.list(),
    match: '/finance',
    subNav: {
      defaultCollapsed: true,
      groups: [
        {
          items: [
            {
              label: 'Billing Accounts',
              href: financeRoutes.billingAccounts.list(),
              icon: CreditCard,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Cog,
    href: activityRoutes.root(),
    match: '/activity',
    subNav: {
      defaultCollapsed: true,
      groups: [
        { items: [{ label: 'Activity', href: activityRoutes.root(), icon: SquareActivity }] },
      ],
    },
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Shield,
    href: groupRoutes.list(),
    subNav: {
      defaultCollapsed: true,
      groups: [
        {
          items: [
            { label: 'Groups', href: groupRoutes.list(), icon: ShieldUser },
            { label: 'Service Catalog', href: serviceCatalogRoutes.list(), icon: Store },
          ],
        },
      ],
    },
  },
  // Hidden for now (routes still work by URL): Fraud & Abuse, Lists (contact groups).
];
