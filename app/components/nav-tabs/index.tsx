import { cn } from '@/modules/shadcn/lib/utils';
import { NavLink } from 'react-router';

export interface NavTabItem {
  label: string;
  to: string;
}

export interface NavTabsProps {
  tabs: NavTabItem[];
  className?: string;
  /** Style variant: 'tabs' (pill style) or 'menu' (text links) */
  variant?: 'tabs' | 'menu';
}

/**
 * NavTabs - A horizontal tab navigation component using react-router NavLink
 *
 * Provides route-based navigation with styling matching the Shadcn Tabs design system.
 * Active state is automatically determined by the current route.
 *
 * @example
 * ```tsx
 * const tabs = [
 *   { label: 'Activity Feed', to: '/activity/feed' },
 *   { label: 'Events', to: '/activity/events' }
 * ];
 *
 * <NavTabs tabs={tabs} />
 * ```
 */
export function NavTabs({ tabs, className, variant = 'tabs' }: NavTabsProps) {
  if (variant === 'menu') {
    return (
      <nav className={cn('flex items-center gap-1', className)}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'text-muted-foreground hover:text-foreground relative px-3 py-1.5 text-sm font-medium transition-colors',
                isActive &&
                  'text-foreground after:bg-primary after:absolute after:right-3 after:bottom-0 after:left-3 after:h-0.5 after:rounded-full'
              )
            }>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <div
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
        className
      )}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50',
              isActive
                ? 'bg-background dark:text-foreground text-foreground shadow-sm'
                : 'hover:bg-background/50'
            )
          }>
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
