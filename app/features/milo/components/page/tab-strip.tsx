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
  /** Active-detection prefix for dropdown tabs (defaults to first child href). */
  match?: string;
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

/** The path a tab represents: its `match`, else `href`, else its first child. */
function tabKey(tab: EntityTab): string {
  return tab.match ?? tab.href ?? tab.children?.[0]?.href ?? '';
}

/** `end` tabs match their key exactly; others match the key or any sub-path. */
function tabMatches(pathname: string, tab: EntityTab): boolean {
  const key = tabKey(tab);
  if (!key) return false;
  if (tab.end) return pathname === key;
  return pathname === key || pathname.startsWith(key + '/');
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
    .filter((tab) => tabMatches(pathname, tab))
    .map(tabKey)
    .sort((a, b) => b.length - a.length)[0];
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
