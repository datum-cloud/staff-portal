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
 * (see the sub-nav parity plan's Phase 2).
 *
 * `tooltip` is only ever passed when `collapsed` — not unconditionally, even
 * though `SidebarMenuButton` internally gates the popup's own visibility on
 * `state === 'collapsed'` already (`hidden={state !== 'collapsed' || ...}`)
 * and would seem to make that redundant. It isn't: passing a truthy
 * `tooltip` makes `SidebarMenuButton` wrap the button in datum-ui's
 * `Tooltip`, whose outermost element is `<span className="relative
 * inline-flex">` — a shrink-to-fit container. `hidden` only suppresses the
 * popup opening; it doesn't undo that wrapper's layout. Since the button
 * itself is `w-full`, wrapping it in an inline-flex ancestor with no width
 * of its own collapses that back down to content width — every active/hover
 * background rendered as a tight pill around the icon+label instead of
 * spanning the rail, expanded, the entire time `tooltip` was passed
 * unconditionally. Only ever needed while collapsed anyway (that's the only
 * time `hidden` ever lets it show), so gating it there fixes both.
 *
 * The label (+ adornments, + chevron for a group) is always mounted and
 * faded via CSS (`app/styles/root.css`'s `[data-slot='sidebar-menu-button']
 * > span:last-child` rules, Phase 4) rather than conditionally rendered —
 * that's *why* it's wrapped in its own trailing `<span>`: the fade rule
 * targets the last child specifically, and everything that should fade
 * together (label, count/badge, the group's chevron) needs to be inside it,
 * not siblings of it.
 *
 * D1: an item with `children` renders as a collapsible group instead of a
 * link — auto-expanded when `activeChildHref` is set, and further
 * toggleable by the operator. The two states genuinely do different things
 * on click (collapsed: navigate to the first child, since there's no room to
 * show them and the tooltip already lists them; expanded: toggle the
 * disclosure) — that's a real behavioral fork, not leftover duplication, but
 * the *content* rendered is identical either way (`content` below), which is
 * what lets the fade apply uniformly regardless of which fork is active.
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

    const content = (
      <>
        {item.icon && <Icon icon={item.icon} size={20} className="shrink-0" />}
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2 truncate text-left">
          <span className="truncate">{item.label}</span>
          <ItemAdornments item={item} />
          <ChevronRight
            className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-90')}
          />
        </span>
      </>
    );

    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild={collapsed}
          type={collapsed ? undefined : 'button'}
          aria-expanded={expanded}
          onClick={collapsed ? undefined : () => setExpanded((e) => !e)}
          tooltip={collapsed ? tooltip : undefined}
          className={cn(groupActive ? activeClass : idleClass)}>
          {collapsed ? <NavLink to={children[0].href ?? ''}>{content}</NavLink> : content}
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
        tooltip={collapsed ? item.label : undefined}
        className={cn(active ? activeClass : idleClass)}>
        <NavLink to={item.href ?? ''}>
          {item.icon && <Icon icon={item.icon} size={20} className="shrink-0" />}
          <span className="flex min-w-0 flex-1 items-center justify-between gap-2 truncate">
            <span className="truncate">{item.label}</span>
            <ItemAdornments item={item} />
          </span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
