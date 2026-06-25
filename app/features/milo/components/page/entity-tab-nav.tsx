import { cn } from '@datum-cloud/datum-ui/utils';
import { NavLink } from 'react-router';

export interface EntityTab {
  label: string;
  href: string;
  icon?: React.ReactNode;
  end?: boolean;
}

interface EntityTabNavProps {
  tabs: EntityTab[];
}

/**
 * STUB (#777) — horizontal pill tab nav replacing the legacy SubLayout left
 * sidebar on detail pages. Final styling lands in #777.
 */
export function EntityTabNav({ tabs }: EntityTabNavProps) {
  return (
    <nav className="flex items-center gap-1 border-b">
      {tabs.map((tab) => (
        <NavLink
          key={tab.href}
          to={tab.href}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )
          }>
          {tab.icon}
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
