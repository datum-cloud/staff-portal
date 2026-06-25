import { HEADER_STACK_H } from '../../lib/dimensions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@datum-cloud/datum-ui/dropdown';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronDown } from 'lucide-react';
import { type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';

export interface EntityTabChild {
  label: string;
  href: string;
}

export interface EntityTab {
  label: string;
  icon?: ReactNode;
  /** Direct-link tab. Mutually exclusive with `children`. */
  href?: string;
  /** Exact match (for the index/Overview tab). */
  end?: boolean;
  /** Dropdown tab: the sub-routes shown on click. */
  children?: EntityTabChild[];
  /** Active-detection prefix for dropdown tabs (defaults to first child href). */
  match?: string;
}

interface EntityTabNavProps {
  tabs: EntityTab[];
}

// Segmented control: a grey strip (on the nav container) with a white active
// pill + primary text/icon; idle tabs are foreground text. Mirrors the design.
const tabBase =
  'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-normal whitespace-nowrap transition-colors';
const tabActive = 'bg-card text-primary';
const tabIdle = 'text-foreground hover:bg-card/60 hover:text-primary';

/**
 * Horizontal pill tab nav for entity detail pages (#777), replacing the legacy
 * SubLayout left sidebar. Direct tabs are NavLinks; tabs with `children` render
 * a dropdown (so sections with sub-routes — Activity, Quotas — stay reachable in
 * a single tab row). Scrolls horizontally on narrow widths.
 */
export function EntityTabNav({ tabs }: EntityTabNavProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    // Sticky so the tab bar stays reachable while the page content scrolls. Sits
    // just below the navbar + context bar; the wrapper carries the background so
    // content doesn't show through behind the pinned bar.
    <div className="bg-background sticky z-10 px-4 py-3" style={{ top: HEADER_STACK_H }}>
      <nav className="bg-border/50 flex items-center gap-1 overflow-x-auto rounded-lg p-1">
        {tabs.map((tab) => {
          if (tab.children?.length) {
            const prefix = tab.match ?? tab.children[0].href;
            const active = pathname.startsWith(prefix);
            return (
              <DropdownMenu key={tab.label}>
                <DropdownMenuTrigger className={cn(tabBase, active ? tabActive : tabIdle)}>
                  {tab.icon}
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
              className={({ isActive }) => cn(tabBase, isActive ? tabActive : tabIdle)}>
              {tab.icon}
              {tab.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
