import {
  CONTEXTBAR_H,
  NAVBAR_H,
  SUBNAV_W_COLLAPSED,
  SUBNAV_W_EXPANDED,
} from '../../lib/dimensions';
import { type NavSubItem, type NavSubNav } from '../../lib/nav-config';
import { MiloSubNavItem } from './milo-sub-nav-item';
import { Button } from '@datum-cloud/datum-ui/button';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';

interface MiloSubNavProps {
  subNav: NavSubNav;
  activeItem?: NavSubItem;
}

/**
 * Region ③ — the left sub-nav rail (#775). One collapsible component: an
 * icon-only rail by default that expands to labels + count badges + optional
 * group headers. Only rendered when the active section has a sub-nav.
 */
export function MiloSubNav({ subNav, activeItem }: MiloSubNavProps) {
  const { t } = useLingui();
  const [collapsed, setCollapsed] = useState(subNav.defaultCollapsed ?? false);

  return (
    <aside
      style={{
        width: collapsed ? SUBNAV_W_COLLAPSED : SUBNAV_W_EXPANDED,
        top: NAVBAR_H + CONTEXTBAR_H,
        height: `calc(100vh - ${NAVBAR_H + CONTEXTBAR_H}px)`,
      }}
      className="bg-background sticky flex shrink-0 flex-col border-r transition-[width]">
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {subNav.groups.map((group, gi) => (
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
                key={item.href}
                item={item}
                active={activeItem?.href === item.href}
                collapsed={collapsed}
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
