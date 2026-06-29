import {
  activityRoutes,
  contactGroupRoutes,
  contactRoutes,
  dnsRoutes,
  domainRoutes,
  edgeRoutes,
  financeRoutes,
  fraudRoutes,
  groupRoutes,
  orgRoutes,
  projectRoutes,
  serviceCatalogRoutes,
  userRoutes,
} from '@/utils/config/routes.config';
import {
  Contact,
  CreditCard,
  Folders,
  Gauge,
  Layers,
  type LucideIcon,
  ShieldAlert,
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
            { label: 'Users', href: userRoutes.list(), icon: Contact },
          ],
        },
      ],
    },
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: Contact,
    href: contactRoutes.list(),
    match: '/contacts',
    subNav: {
      defaultCollapsed: true,
      groups: [
        {
          items: [
            { label: 'Contacts', href: contactRoutes.list(), icon: Contact },
            { label: 'Lists', href: contactGroupRoutes.list(), icon: Layers },
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
              icon: CreditCard,
            },
          ],
        },
      ],
    },
  },
  { id: 'edge', label: 'AI Edge', icon: Gauge, href: edgeRoutes.list() },
  { id: 'dns', label: 'DNS', icon: Signpost, href: dnsRoutes.list() },
  { id: 'domains', label: 'Domains', icon: Layers, href: domainRoutes.list() },
  { id: 'groups', label: 'Groups', icon: ShieldUser, href: groupRoutes.list() },
  { id: 'activity', label: 'Activity', icon: SquareActivity, href: activityRoutes.root() },
  { id: 'catalog', label: 'Service Catalog', icon: Store, href: serviceCatalogRoutes.list() },
  { id: 'fraud', label: 'Fraud & Abuse', icon: ShieldAlert, href: fraudRoutes.root() },
];
