import { type NavSubItem } from '../../lib/nav-config';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { NavLink } from 'react-router';

interface MiloSubNavItemProps {
  item: NavSubItem;
  active: boolean;
  collapsed: boolean;
}

/**
 * One entry in the left sub-nav rail. Icon-only (with tooltip) when collapsed;
 * icon + label + count badge when expanded. NavLink keeps navigation client-side.
 */
export function MiloSubNavItem({ item, active, collapsed }: MiloSubNavItemProps) {
  const link = (
    <NavLink
      to={item.href}
      className={cn(
        // Same treatment as the top menu: active and hover get a white pill
        // (--card) with a border and primary-coloured text/icon. Transparent base
        // border avoids layout shift.
        'flex items-center rounded-md border border-transparent transition-colors',
        collapsed ? 'size-9 justify-center' : 'gap-2 px-2 py-1.5',
        active ? 'bg-card text-primary' : 'text-foreground hover:bg-card hover:text-primary'
      )}>
      {item.icon && <Icon icon={item.icon} size={20} className="shrink-0" />}
      {!collapsed && (
        <>
          <Text size="sm" weight="medium" className="flex-1 truncate">
            {item.label}
          </Text>
          {typeof item.count === 'number' && (
            <Badge type="secondary" className="tabular-nums">
              {item.count}
            </Badge>
          )}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip message={item.label} side="right">
      {link}
    </Tooltip>
  );
}
