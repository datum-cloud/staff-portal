import { HEADER_STACK_H, SUBNAV_W_COLLAPSED, SUBNAV_W_EXPANDED } from '../../lib/dimensions';
import { type EntityNav, type NavSubNav } from '../../lib/nav-config';
import { useActiveSubNavItem } from '../../lib/use-active-subnav-item';
import { useSubNavOpen } from '../../lib/use-subnav-open';
import { MiloSubNavItem } from './milo-sub-nav-item';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarProvider,
  useSidebar,
} from '@datum-cloud/datum-ui/sidebar';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router';

interface MiloSubNavProps {
  /** A section's static rail, or the active route's entity rail (see `useEntityNav`) — same group/item chrome either way. */
  nav: NavSubNav | EntityNav;
  /** The root loader's SSR-resolved open preference (see `useSubNavOpen`) — avoids a flash of the wrong state on first paint. */
  initialOpen?: boolean;
}

function isEntityNav(nav: NavSubNav | EntityNav): nav is EntityNav {
  return 'title' in nav;
}

/** The entity rail's back-link + icon + title, above its groups (D2). */
function EntityHeader({ entityNav }: { entityNav: EntityNav }) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <SidebarHeader className="gap-2 border-b">
      {entityNav.backTo &&
        (collapsed ? (
          <NavLink
            to={entityNav.backTo.href}
            aria-label={entityNav.backTo.label}
            className="text-foreground hover:bg-card hover:text-primary flex size-9 items-center justify-center rounded-md transition-colors">
            <ArrowLeft className="size-4" />
          </NavLink>
        ) : (
          <NavLink
            to={entityNav.backTo.href}
            className="text-muted-foreground hover:text-primary flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors">
            <ArrowLeft className="size-3.5 shrink-0" />
            <span className="truncate">{entityNav.backTo.label}</span>
          </NavLink>
        ))}
      <div className={cn('flex items-center gap-2 px-2', collapsed && 'justify-center px-0')}>
        {entityNav.icon && <Icon icon={entityNav.icon} size={20} className="shrink-0" />}
        {!collapsed && (
          <Text size="sm" weight="semibold" className="truncate">
            {entityNav.title}
          </Text>
        )}
      </div>
    </SidebarHeader>
  );
}

/** The rail's own collapse/expand control, pinned to the bottom. */
function CollapseToggle() {
  const { t } = useLingui();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <SidebarFooter className="border-t p-0">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={collapsed ? t`Expand sidebar` : t`Collapse sidebar`}
        className={cn(
          'text-muted-foreground hover:bg-card hover:text-primary flex items-center gap-2 rounded-none px-4 py-2.5 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-0'
        )}>
        {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        {!collapsed && t`Collapse`}
      </button>
    </SidebarFooter>
  );
}

/**
 * Region ③ — the left sub-nav rail (#775). One collapsible component: an
 * icon-only rail by default that expands to labels + count badges + optional
 * group headers. Renders either a section's `NavSubNav` (only when the active
 * section declares one) or an entity's `EntityNav` (#656) — an `EntityNav`
 * additionally gets a `backTo` + icon + title header above the groups (D2).
 *
 * Built on datum-ui's `Sidebar` primitives (sub-nav parity plan, Phase 2) —
 * each `MiloSubNav` instance owns its own `SidebarProvider`, scoped to just
 * this rail, rather than sharing the app-wide one `MiloLayout` mounts. That
 * outer provider is NOT dead weight, despite Phase 0a's first read: nothing
 * calls `useSidebar()` directly outside the legacy `AppSidebar`, but the
 * legacy `SubLayout`'s menu (`app/components/sub-layout/sidebar-menu*.tsx`)
 * renders datum-ui's `SidebarMenuButton`, which calls `useSidebar()`
 * internally — so it still needs an ambient provider, just not this rail's.
 * Nesting our own here keeps this component mountable standalone (the way
 * the Cypress specs already do) without taking over that shared context.
 */
export function MiloSubNav({ nav, initialOpen }: MiloSubNavProps) {
  const entityNav = isEntityNav(nav) ? nav : undefined;
  // D4: the entity rail defaults expanded — its labels are the navigation.
  const defaultCollapsed = isEntityNav(nav) ? false : (nav.defaultCollapsed ?? false);
  // D3: either way, the operator's choice persists across navigation.
  const [open, setOpen] = useSubNavOpen(defaultCollapsed, initialOpen);
  const { item: activeItem, parent: activeParent } = useActiveSubNavItem(nav.groups);

  return (
    <SidebarProvider
      open={open}
      onOpenChange={setOpen}
      className="contents"
      style={
        {
          '--sidebar-width': `${SUBNAV_W_EXPANDED / 16}rem`,
          '--sidebar-width-icon': `${SUBNAV_W_COLLAPSED / 16}rem`,
        } as React.CSSProperties
      }>
      <Sidebar
        collapsible="icon"
        style={{ top: HEADER_STACK_H, height: `calc(100vh - ${HEADER_STACK_H}px)` }}>
        {entityNav && <EntityHeader entityNav={entityNav} />}

        <SidebarContent className="gap-1 p-2">
          {nav.groups.map((group, gi) => (
            <SidebarGroup key={group.label ?? gi} className="gap-1 p-0">
              {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarMenu>
                {group.items.map((item) => (
                  <MiloSubNavItem
                    key={item.href ?? item.label}
                    item={item}
                    active={activeItem === item}
                    activeChildHref={activeParent === item ? activeItem?.href : undefined}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <CollapseToggle />
      </Sidebar>
    </SidebarProvider>
  );
}
