import {
  BookUser,
  Building2,
  Cog,
  Contact,
  CreditCard,
  Folders,
  Gauge,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Megaphone,
  Newspaper,
  ReceiptText,
  Shield,
  ShieldAlert,
  ShieldUser,
  Signpost,
  SquareActivity,
  Users,
  UsersRound,
} from 'lucide-react';

/**
 * Icon inventory — the single source of truth for the icon that represents each
 * entity/resource and each top-level nav section.
 *
 * Reference these anywhere an entity or section shows up (global nav, detail-page
 * headers, dashboard cards, search results) so one thing always looks the same
 * app-wide. To (re)assign an icon, edit it HERE, not inline in a component.
 *
 * Every icon should be unique across both maps; the dev-only guard at the bottom
 * warns in the console if two keys ever share one (usually a copy-paste slip).
 */

/** Icons for entities/resources — reused across nav, headers, cards, search. */
export const ENTITY_ICONS = {
  // Customers
  organization: Building2,
  project: Folders,
  resource: LayoutDashboard,
  user: Users,
  // Marketing
  contact: Contact,
  contactGroup: BookUser,
  // Finance
  billingAccount: ReceiptText,
  // Operations
  activity: SquareActivity,
  emailActivity: Mail,
  // Admin
  group: ShieldUser,
  serviceCatalog: Newspaper,
  // Resources (global views across all projects)
  edge: Gauge,
  dns: Signpost,
  domain: Layers,
  // Not in the menu
  fraud: ShieldAlert,
} satisfies Record<string, LucideIcon>;

/** Icons for the top-level nav sections (the navbar chips). */
export const SECTION_ICONS = {
  customers: UsersRound,
  marketing: Megaphone,
  finance: CreditCard,
  operations: Cog,
  admin: Shield,
} satisfies Record<string, LucideIcon>;

export type EntityIconKey = keyof typeof ENTITY_ICONS;
export type SectionIconKey = keyof typeof SECTION_ICONS;

// Dev guard: two things sharing an icon is almost always an accident. Warn (not
// throw) so it never breaks the app — it just nudges you to pick a distinct one.
if (process.env.NODE_ENV !== 'production') {
  const byIcon = new Map<string, string>();
  const all = { ...ENTITY_ICONS, ...SECTION_ICONS };
  for (const [key, icon] of Object.entries(all)) {
    const name = (icon as { displayName?: string }).displayName ?? icon.name;
    const prev = byIcon.get(name);
    if (prev) {
      console.warn(
        `[icons.config] "${name}" is used by both "${prev}" and "${key}" — pick a unique icon.`
      );
    }
    byIcon.set(name, key);
  }
}
