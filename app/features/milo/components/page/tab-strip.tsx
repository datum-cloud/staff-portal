import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@datum-cloud/datum-ui/dropdown';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';

export interface EntityTabChild {
  label: string;
  href: string;
}

export interface EntityTab {
  label: string;
  icon?: LucideIcon;
  /** Direct-link tab. Mutually exclusive with `children`. */
  href?: string;
  /** Exact match (for the index/Overview tab). */
  end?: boolean;
  /** Dropdown tab: the sub-routes shown on click. */
  children?: EntityTabChild[];
  /**
   * Active-detection prefix(es) for dropdown tabs (defaults to first child href).
   * Use an array when children live under sibling path segments (e.g. edges/dns/domains).
   */
  match?: string | string[];
  /** Optional trailing adornment (e.g. a count/pending badge). */
  badge?: ReactNode;
}

// Segmented control: a grey strip with a white active pill + primary text/icon;
// idle tabs are foreground text. One source of truth for every tab bar.
const stripClass = 'bg-border/50 flex items-center gap-1 overflow-x-auto rounded-lg p-1';
const itemClass =
  'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-normal whitespace-nowrap transition-colors';
const activeClass = 'bg-card text-primary';
const idleClass = 'text-foreground hover:bg-card/60 hover:text-primary';

/** Path prefixes used for active detection. */
function matchPrefixes(tab: EntityTab): string[] {
  if (tab.match != null) {
    return Array.isArray(tab.match) ? tab.match : [tab.match];
  }
  if (tab.href) return [tab.href];
  if (tab.children?.[0]?.href) return [tab.children[0].href];
  return [];
}

/** Stable identity for comparing which tab won the active-prefix contest. */
function tabKey(tab: EntityTab): string {
  const prefixes = matchPrefixes(tab);
  return prefixes.join('\0');
}

/** Longest matching prefix for this tab, or null if none match. */
function bestPrefixForTab(pathname: string, tab: EntityTab): string | null {
  const prefixes = matchPrefixes(tab);
  if (prefixes.length === 0) return null;

  let best: string | null = null;
  for (const key of prefixes) {
    const matches = tab.end ? pathname === key : pathname === key || pathname.startsWith(key + '/');
    if (!matches) continue;
    if (best == null || key.length > best.length) best = key;
  }
  return best;
}

/**
 * Segmented pill tab strip. Direct tabs are `NavLink`s; tabs with `children`
 * open a dropdown (so sections with sub-routes stay in one row). Used by detail
 * pages (`EntityTabNav`) and the Resources page.
 *
 * Active tab = longest matching prefix, so a root tab (e.g. Fraud's Evaluations
 * at the section root) stays active on its detail pages without also lighting up
 * more-specific sibling tabs (Providers/Policy).
 */
export function TabStrip({ tabs, className }: { tabs: EntityTab[]; className?: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const activeKey = tabs
    .map((tab) => {
      const prefix = bestPrefixForTab(pathname, tab);
      return prefix == null ? null : { key: tabKey(tab), prefix };
    })
    .filter((entry): entry is { key: string; prefix: string } => entry != null)
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]?.key;
  const isActive = (tab: EntityTab) => activeKey != null && tabKey(tab) === activeKey;

  return (
    <nav className={cn(stripClass, className)}>
      {tabs.map((tab) => {
        if (tab.children?.length) {
          return (
            <DropdownMenu key={tab.label}>
              <DropdownMenuTrigger
                className={cn(itemClass, isActive(tab) ? activeClass : idleClass)}>
                {tab.icon && <Icon icon={tab.icon} />}
                {tab.label}
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {tab.children.map((child) => (
                  <DropdownMenuItem key={child.href} onClick={() => navigate(child.href)}>
                    {child.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <NavLink
            key={tab.href}
            to={tab.href ?? '#'}
            className={cn(itemClass, isActive(tab) ? activeClass : idleClass)}>
            {tab.icon && <Icon icon={tab.icon} />}
            {tab.label}
            {tab.badge}
          </NavLink>
        );
      })}
    </nav>
  );
}
