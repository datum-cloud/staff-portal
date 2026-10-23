import { SectionSwitcher } from './section-switcher';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';

export interface ViewTab {
  label: string;
  href: string;
  icon?: LucideIcon;
  /** Exact-match only — set on an index view so it isn't active under its siblings. */
  end?: boolean;
}

/**
 * Segmented control for switching between a section page's views (e.g. Fraud →
 * Evaluations / Providers / Policy), shown in the list search bar beside the
 * section switcher.
 */
export function ViewTabs({ views }: { views: ViewTab[] }) {
  return (
    <nav className="bg-muted flex h-7 items-center gap-0.5 rounded-md p-0.5">
      {views.map((view) => (
        <NavLink
          key={view.href}
          to={view.href}
          end={view.end}
          className={({ isActive }) =>
            cn(
              'group flex h-6 items-center gap-1.5 rounded px-2 transition-colors',
              isActive ? 'bg-background shadow-xs' : 'hover:bg-background/60'
            )
          }>
          {({ isActive }) => (
            <>
              {view.icon && (
                <Icon
                  icon={view.icon}
                  className={cn(
                    'size-3.5 shrink-0',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                />
              )}
              <Text
                as="span"
                size="sm"
                weight={isActive ? 'medium' : 'normal'}
                textColor={isActive ? 'default' : 'muted'}
                className="group-hover:text-foreground whitespace-nowrap">
                {view.label}
              </Text>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * The switcher + view tabs on their own, for a section view with no list (e.g.
 * Fraud → Policy), so its top edge matches the list pages' search bar.
 */
export function SectionViewBar({ views }: { views: ViewTab[] }) {
  return (
    <div className="flex h-10 shrink-0 items-center border-b">
      <div className="flex shrink-0 items-center self-stretch border-r px-1.5">
        <SectionSwitcher />
      </div>
      <div className="flex shrink-0 items-center self-stretch px-1.5">
        <ViewTabs views={views} />
      </div>
    </div>
  );
}
