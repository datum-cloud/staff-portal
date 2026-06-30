import { type NavSection } from '../../lib/nav-config';
import { cn } from '@datum-cloud/datum-ui/utils';
import { NavLink } from 'react-router';

interface MiloNavItemProps {
  section: NavSection;
  active: boolean;
}

/** One top-level section in the global navbar's horizontal main menu. */
export function MiloNavItem({ section, active }: MiloNavItemProps) {
  return (
    <NavLink
      to={section.href}
      className={cn(
        'rounded-md border border-transparent px-2 py-0.5 whitespace-nowrap transition-colors',
        active ? 'bg-card text-primary' : 'text-foreground hover:bg-card hover:text-primary'
      )}>
      <span className="text-sm font-medium">{section.label}</span>
    </NavLink>
  );
}
