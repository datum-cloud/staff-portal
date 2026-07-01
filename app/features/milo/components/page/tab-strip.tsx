import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@datum-cloud/datum-ui/dropdown';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronDown, type LucideIcon } from 'lucide-react';
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
}

// Segmented control: a grey strip with a white active pill + primary text/icon;
// idle tabs are foreground text. One source of truth for every tab bar.
const stripClass = 'bg-border/50 flex items-center gap-1 overflow-x-auto rounded-lg p-1';
const itemClass =
  'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-normal whitespace-nowrap transition-colors';
const activeClass = 'bg-card text-primary';
const idleClass = 'text-foreground hover:bg-card/60 hover:text-primary';

/**
 * Segmented pill tab strip. Direct tabs are `NavLink`s; tabs with `children`
 * open a dropdown (so sections with sub-routes stay in one row). Used by detail
 * pages (`EntityTabNav`) and the Resources page.
 */
export function TabStrip({ tabs, className }: { tabs: EntityTab[]; className?: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className={cn(stripClass, className)}>
      {tabs.map((tab) => {
        if (tab.children?.length) {
          const prefix = tab.match ?? tab.children[0].href;
          const active = pathname.startsWith(prefix);
          return (
            <DropdownMenu key={tab.label}>
              <DropdownMenuTrigger className={cn(itemClass, active ? activeClass : idleClass)}>
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
            end={tab.end}
            className={({ isActive }) => cn(itemClass, isActive ? activeClass : idleClass)}>
            {tab.icon && <Icon icon={tab.icon} />}
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
