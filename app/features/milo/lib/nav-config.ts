import {
  activityRoutes,
  contactGroupRoutes,
  contactRoutes,
  financeRoutes,
  groupRoutes,
  orgRoutes,
  projectRoutes,
  resourceRoutes,
  routes,
  serviceCatalogRoutes,
  userRoutes,
} from '@/utils/config/routes.config';
import {
  BookUser,
  Building2,
  Cog,
  Contact,
  CreditCard,
  Folders,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Megaphone,
  ReceiptText,
  Shield,
  ShieldUser,
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
  /** Prefix(es) for active detection; defaults to `href`. Array ⇒ active if any matches (e.g. Resources spanning /edges, /dns, /domains). */
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
            { label: 'Organizations', href: orgRoutes.list(), icon: Building2 },
            { label: 'Projects', href: projectRoutes.list(), icon: Folders },
            // One "Resources" entry → a tabbed page (AI Edge / DNS / Domains),
            // all nested under /customers/resources.
            {
              label: 'Resources',
              href: resourceRoutes.root(),
              match: resourceRoutes.root(),
              icon: LayoutDashboard,
            },
            { label: 'Users', href: userRoutes.list(), icon: Users },
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
    match: '/marketing',
    subNav: {
      defaultCollapsed: true,
      groups: [
        {
          items: [
            { label: 'Contacts', href: contactRoutes.list(), icon: Contact },
            { label: 'Contact Groups', href: contactGroupRoutes.list(), icon: BookUser },
          ],
        },
      ],
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
              icon: ReceiptText,
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
    match: '/operations',
    subNav: {
      defaultCollapsed: true,
      groups: [
        {
          items: [
            { label: 'Activity', href: activityRoutes.root(), icon: SquareActivity },
            { label: 'Email Activity', href: routes.emailActivity(), icon: Mail },
          ],
        },
      ],
    },
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Shield,
    href: groupRoutes.list(),
    match: '/admin',
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
  // Hidden for now (routes still work by URL): Fraud & Abuse.
];
