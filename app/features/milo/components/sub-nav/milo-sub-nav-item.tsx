import { type NavSubItem } from '../../lib/nav-config';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router';

interface MiloSubNavItemProps {
  item: NavSubItem;
  active: boolean;
  collapsed: boolean;
  /** D1: for an item with `children`, which child is active — highlights it and auto-expands the group. */
  activeChildHref?: string;
}

const rowClass = 'flex items-center rounded-md border border-transparent transition-colors w-full';
const idleClass = 'text-foreground hover:bg-card hover:text-primary';
const activeClass = 'bg-card text-primary';

/** Count + badge adornments shared by leaf items and the parent row of a children group. */
function ItemAdornments({ item }: { item: NavSubItem }) {
  return (
    <>
      {item.badge}
      {typeof item.count === 'number' && (
        <Badge type="secondary" className="tabular-nums">
          {item.count}
        </Badge>
      )}
    </>
  );
}

/**
 * One entry in the left sub-nav rail. Icon-only (with tooltip) when collapsed;
 * icon + label + count badge when expanded. NavLink keeps navigation client-side.
 *
 * D1: an item with `children` renders as a collapsible group instead of a
 * link — auto-expanded when `activeChildHref` is set, and further
 * toggleable by the operator. Collapsed rail: a tooltip lists the children
 * since there's no room to show them.
 */
export function MiloSubNavItem({ item, active, collapsed, activeChildHref }: MiloSubNavItemProps) {
  const children = item.children;
  const [expanded, setExpanded] = useState(Boolean(activeChildHref));

  // Auto-expand (D1) when navigation lands on a child of an already-mounted,
  // collapsed group — adjusted during render (React's documented escape hatch
  // for state derived from a changed prop) rather than an effect, so it takes
  // effect in the same commit instead of a follow-up render. Sticky: once
  // expanded (by a match or a manual toggle), a later non-matching navigation
  // doesn't collapse it back.
  const [prevActiveChildHref, setPrevActiveChildHref] = useState(activeChildHref);
  if (activeChildHref !== prevActiveChildHref) {
    setPrevActiveChildHref(activeChildHref);
    if (activeChildHref) setExpanded(true);
  }

  if (children?.length) {
    const groupActive = Boolean(activeChildHref);

    if (collapsed) {
      return (
        <Tooltip
          side="right"
          message={
            <div className="flex flex-col gap-1">
              <Text size="xs" weight="semibold">
                {item.label}
              </Text>
              {children.map((child) => (
                <Text key={child.href} size="xs">
                  {child.label}
                </Text>
              ))}
            </div>
          }>
          <NavLink
            to={children[0].href ?? ''}
            className={cn(
              rowClass,
              'size-9 justify-center',
              groupActive ? activeClass : idleClass
            )}>
            {item.icon && <Icon icon={item.icon} size={20} className="shrink-0" />}
          </NavLink>
        </Tooltip>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className={cn(rowClass, 'gap-2 px-2 py-1.5', groupActive ? activeClass : idleClass)}>
          {item.icon && <Icon icon={item.icon} size={20} className="shrink-0" />}
          <Text size="sm" weight="medium" className="flex-1 truncate text-left">
            {item.label}
          </Text>
          <ItemAdornments item={item} />
          <ChevronRight
            className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-90')}
          />
        </button>
        {expanded && (
          <div className="ml-3.5 flex flex-col gap-1 border-l pl-3">
            {children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href ?? ''}
                className={cn(
                  rowClass,
                  'px-2 py-1.5',
                  child.href === activeChildHref ? activeClass : idleClass
                )}>
                <Text size="sm" weight="medium" className="flex-1 truncate">
                  {child.label}
                </Text>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  const link = (
    <NavLink
      to={item.href ?? ''}
      className={cn(
        // Same treatment as the top menu: active and hover get a white pill
        // (--card) with a border and primary-coloured text/icon. Transparent base
        // border avoids layout shift.
        rowClass,
        collapsed ? 'size-9 justify-center' : 'gap-2 px-2 py-1.5',
        active ? activeClass : idleClass
      )}>
      {item.icon && <Icon icon={item.icon} size={20} className="shrink-0" />}
      {!collapsed && (
        <>
          <Text size="sm" weight="medium" className="flex-1 truncate">
            {item.label}
          </Text>
          <ItemAdornments item={item} />
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
