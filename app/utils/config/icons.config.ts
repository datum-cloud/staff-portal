import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  Ban,
  BarChart3,
  BookUser,
  Building2,
  ChartSpline,
  Check,
  CheckCircle,
  CircleGauge,
  Clock,
  Cog,
  Contact,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileLock,
  FileText,
  Flag,
  FlaskConical,
  Folders,
  Gauge,
  Info,
  Layers,
  LayoutDashboard,
  ListFilter,
  Loader2,
  LogOut,
  type LucideIcon,
  Mail,
  Megaphone,
  Minus,
  MoreHorizontal,
  Newspaper,
  PlusCircle,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  SendHorizonal,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  ShieldUser,
  Signpost,
  SquareActivity,
  SquarePen,
  Tag,
  Trash2,
  UserPlus,
  Users,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';

/**
 * Icon inventory — the single source of truth for icons that carry meaning and
 * recur across the app. Reference these anywhere an entity, section, tab,
 * action, or status shows up so one thing always looks the same app-wide. To
 * (re)assign an icon, edit it HERE, not inline in a component.
 *
 * Scope: semantic icons only. Purely directional affordances (chevrons, arrows,
 * panel toggles) and decorative/domain glyphs (Cpu, HardDrive, MapPin, …) stay
 * inline — centralizing those adds indirection without a consistency payoff.
 *
 * Icons in the two identity maps (ENTITY_ICONS, SECTION_ICONS) must be unique;
 * the dev-only guard at the bottom warns if two ever collide. TAB/ACTION/STATUS
 * icons may intentionally reuse an entity icon (e.g. the Members tab = user).
 */

/** Entities/resources — reused across nav, detail headers, cards, search. */
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
  chainsawTest: FlaskConical,
  emailActivity: Mail,
  // Admin
  group: ShieldUser,
  serviceCatalog: Newspaper,
  offer: Tag,
  // Resources (global views across all projects)
  edge: Gauge,
  dns: Signpost,
  domain: Layers,
  suspendedProject: Ban,
  // Not in the menu
  fraud: ShieldAlert,
} satisfies Record<string, LucideIcon>;

/** Top-level nav sections (the navbar chips). */
export const SECTION_ICONS = {
  customers: UsersRound,
  marketing: Megaphone,
  finance: CreditCard,
  operations: Cog,
  admin: Shield,
} satisfies Record<string, LucideIcon>;

/** Detail-page tabs that aren't themselves an entity (entity tabs use ENTITY_ICONS). */
export const TAB_ICONS = {
  overview: FileText,
  usage: BarChart3,
  metrics: ChartSpline,
  quotas: CircleGauge,
  featureFlags: Flag,
  secrets: FileLock,
} satisfies Record<string, LucideIcon>;

/** Generic UI actions — one canonical icon per action across all buttons/menus. */
export const ACTION_ICONS = {
  add: PlusCircle,
  edit: SquarePen,
  delete: Trash2,
  remove: Minus,
  close: X,
  check: Check,
  externalLink: ExternalLink,
  search: Search,
  filter: ListFilter,
  refresh: RefreshCw,
  reset: RotateCcw,
  copy: Copy,
  download: Download,
  invite: UserPlus,
  more: MoreHorizontal,
  view: Eye,
  settings: Settings,
  logout: LogOut,
  send: SendHorizonal,
  transfer: ArrowRightLeft,
  share: Share2,
} satisfies Record<string, LucideIcon>;

/** Status / feedback icons — success, error, etc. */
export const STATUS_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  alert: AlertCircle,
  loading: Loader2,
  pending: Clock,
} satisfies Record<string, LucideIcon>;

export type EntityIconKey = keyof typeof ENTITY_ICONS;
export type SectionIconKey = keyof typeof SECTION_ICONS;
export type TabIconKey = keyof typeof TAB_ICONS;
export type ActionIconKey = keyof typeof ACTION_ICONS;
export type StatusIconKey = keyof typeof STATUS_ICONS;

// Dev guard: within the identity maps, two things sharing an icon is almost
// always an accident. Warn (not throw) so it never breaks the app.
if (process.env.NODE_ENV !== 'production') {
  const byIcon = new Map<string, string>();
  const identity = { ...ENTITY_ICONS, ...SECTION_ICONS };
  for (const [key, icon] of Object.entries(identity)) {
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
