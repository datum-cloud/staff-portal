import {
  CONTEXTBAR_H,
  NAVBAR_H,
  SUBNAV_W_COLLAPSED,
  SUBNAV_W_EXPANDED,
} from '../../lib/dimensions';
import { type EntityNav, type NavSubNav } from '../../lib/nav-config';
import { useActiveSubNavItem } from '../../lib/use-active-subnav-item';
import { useSubNavCollapsed } from '../../lib/use-subnav-collapsed';
import { MiloSubNavItem } from './milo-sub-nav-item';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router';

interface MiloSubNavProps {
  /** A section's static rail, or the active route's entity rail (see `useEntityNav`) — same group/item chrome either way. */
  nav: NavSubNav | EntityNav;
  /** The root loader's SSR-resolved collapse preference (see `useSubNavCollapsed`) — avoids a flash of the wrong state on first paint. */
  initialOpen?: boolean;
}

function isEntityNav(nav: NavSubNav | EntityNav): nav is EntityNav {
  return 'title' in nav;
}

/**
 * Region ③ — the left sub-nav rail (#775). One collapsible component: an
 * icon-only rail by default that expands to labels + count badges + optional
 * group headers. Renders either a section's `NavSubNav` (only when the active
 * section declares one) or an entity's `EntityNav` (#656) — an `EntityNav`
 * additionally gets a `backTo` + icon + title header above the groups (D2).
 */
export function MiloSubNav({ nav, initialOpen }: MiloSubNavProps) {
  const { t } = useLingui();
  const entityNav = isEntityNav(nav) ? nav : undefined;
  // D4: the entity rail defaults expanded — its labels are the navigation.
  // D3: either way, the operator's choice persists across navigation.
  const [collapsed, setCollapsed] = useSubNavCollapsed(
    isEntityNav(nav) ? false : (nav.defaultCollapsed ?? false),
    initialOpen
  );
  const { item: activeItem, parent: activeParent } = useActiveSubNavItem(nav.groups);

  return (
    <aside
      style={{
        width: collapsed ? SUBNAV_W_COLLAPSED : SUBNAV_W_EXPANDED,
        top: NAVBAR_H + CONTEXTBAR_H,
        height: `calc(100vh - ${NAVBAR_H + CONTEXTBAR_H}px)`,
      }}
      className="bg-background sticky flex shrink-0 flex-col border-r transition-[width]">
      {entityNav && (
        <div className="flex flex-col gap-2 border-b p-2">
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
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {nav.groups.map((group, gi) => (
          <div key={group.label ?? gi} className="flex flex-col gap-1">
            {group.label && !collapsed && (
              <Text
                size="xs"
                weight="medium"
                textColor="muted"
                className="px-2 pt-2 tracking-wide uppercase">
                {group.label}
              </Text>
            )}
            {group.items.map((item) => (
              <MiloSubNavItem
                key={item.href ?? item.label}
                item={item}
                active={activeItem === item}
                collapsed={collapsed}
                activeChildHref={activeParent === item ? activeItem?.href : undefined}
              />
            ))}
          </div>
        ))}
      </nav>

      <Button
        type="tertiary"
        theme="borderless"
        size="small"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? t`Expand sidebar` : t`Collapse sidebar`}
        className={cn('justify-start gap-2 rounded-none border-t', collapsed && 'justify-center')}>
        {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        {!collapsed && t`Collapse`}
      </Button>
    </aside>
  );
}
