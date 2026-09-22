import { type NavSubItem } from '../../lib/nav-config';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@datum-cloud/datum-ui/sidebar';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router';

interface MiloSubNavItemProps {
  item: NavSubItem;
  active: boolean;
  /** D1: for an item with `children`, which child is active — highlights it and auto-expands the group. */
  activeChildHref?: string;
}

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
 * One entry in the left sub-nav rail, built on datum-ui's `SidebarMenuButton`
 * (see the sub-nav parity plan's Phase 2). Its collapsed-rail tooltip comes
 * free — `SidebarMenuButton` mounts it unconditionally and gates visibility
 * on `state === 'collapsed'` internally, unlike the pre-Phase-2 version's
 * manually-conditional `Tooltip` wrapper.
 *
 * The *label* is a different story, and deliberately still conditionally
 * mounted (`{!collapsed && <span>...}`) rather than always-rendered +
 * CSS-hidden: `SidebarMenuButton` has no built-in `group-data-[collapsible=icon]:hidden`
 * on its own children, so an always-mounted label would just sit there
 * clipped by the button's `overflow-hidden` rather than actually disappear.
 * Phase 4 (motion) is what earns switching this to always-mounted +
 * opacity-fade — doing it now, ahead of that CSS, would be a regression, and
 * would also break any Cypress assertion checking DOM presence (`not.exist`)
 * rather than paint.
 *
 * D1: an item with `children` renders as a collapsible group instead of a
 * link — auto-expanded when `activeChildHref` is set, and further
 * toggleable by the operator. The two states genuinely do different things
 * on click (collapsed: navigate to the first child, since there's no room to
 * show them and the tooltip already lists them; expanded: toggle the
 * disclosure) — that's a real behavioral fork, not leftover duplication.
 */
export function MiloSubNavItem({ item, active, activeChildHref }: MiloSubNavItemProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
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
    const tooltip = {
      message: (
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
      ),
    };

    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild={collapsed}
          type={collapsed ? undefined : 'button'}
          aria-expanded={expanded}
          onClick={collapsed ? undefined : () => setExpanded((e) => !e)}
          tooltip={tooltip}
          className={cn(groupActive ? activeClass : idleClass)}>
          {collapsed ? (
            <NavLink to={children[0].href ?? ''}>
              {item.icon && <Icon icon={item.icon} size={20} className="shrink-0" />}
            </NavLink>
          ) : (
            <>
              {item.icon && <Icon icon={item.icon} size={20} className="shrink-0" />}
              <span className="flex-1 truncate text-left">{item.label}</span>
              <ItemAdornments item={item} />
              <ChevronRight
                className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-90')}
              />
            </>
          )}
        </SidebarMenuButton>
        {!collapsed && expanded && (
          <SidebarMenuSub>
            {children.map((child) => (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton
                  asChild
                  className={cn(child.href === activeChildHref ? activeClass : idleClass)}>
                  <NavLink to={child.href ?? ''}>
                    <span className="truncate">{child.label}</span>
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.label}
        className={cn(active ? activeClass : idleClass)}>
        <NavLink to={item.href ?? ''}>
          {item.icon && <Icon icon={item.icon} size={20} className="shrink-0" />}
          {/* Conditionally unmounted, not just CSS-hidden: Phase 4 (motion)
              is what turns this into an always-mounted, opacity-faded label —
              doing that now, ahead of the fade CSS that makes it meaningful,
              would leave the full label sitting in the DOM (just visually
              clipped by the button's `overflow-hidden`), which both looks
              wrong and reads as "visible" to anything checking DOM presence
              rather than paint (e.g. Cypress's `not.exist`). */}
          {!collapsed && (
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2 truncate">
              <span className="truncate">{item.label}</span>
              <ItemAdornments item={item} />
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
