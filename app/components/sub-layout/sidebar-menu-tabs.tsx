import type { MenuItem } from './sidebar-menu';
import { pickMostSpecificHref } from './use-active-path';
import { cn } from '@datum-cloud/datum-ui/utils';
import { NavLink, useLocation } from 'react-router';

interface SidebarMenuTabsProps {
  menuItems: MenuItem[];
  className?: string;
}

interface FlatTab {
  title: string;
  href: string;
}

function flattenMenu(items: MenuItem[]): FlatTab[] {
  return items.flatMap((item) => {
    if (item.hasSubmenu && item.submenuItems) {
      return item.submenuItems.map((sub) => ({ title: sub.title, href: sub.href }));
    }
    return item.href ? [{ title: item.title, href: item.href }] : [];
  });
}

export function SidebarMenuTabs({ menuItems, className }: SidebarMenuTabsProps) {
  const location = useLocation();
  const tabs = flattenMenu(menuItems);

  // Pick the most specific matching tab so nested routes don't light up both
  // the parent ("Overview") and the current child tab.
  const activeHref = pickMostSpecificHref(
    location.pathname,
    tabs.map((t) => t.href)
  );

  if (tabs.length === 0) return null;

  return (
    <div
      className={cn('bg-background sticky top-14 z-10 border-b', className)}
      data-slot="sub-layout-tabs">
      <nav
        aria-label="Section navigation"
        className="flex overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`[data-slot="sub-layout-tabs"] nav::-webkit-scrollbar { display: none; }`}</style>
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          return (
            <NavLink
              key={tab.href}
              to={tab.href}
              className={cn(
                'shrink-0 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              )}>
              {tab.title}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
