import { HEADER_STACK_H, tabActive, tabBase, tabIdle, tabStripClass } from '@/features/milo';
import { dnsRoutes, domainRoutes, edgeRoutes } from '@/utils/config/routes.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans, useLingui } from '@lingui/react/macro';
import { Gauge, Layers, Signpost } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Resources</Trans>,
};

/**
 * Customers → Resources: one page with an AI Edge / DNS / Domains tab bar. The
 * three global lists (their own routes) render into the content area below. The
 * bar reuses the detail-page segmented style so tabs look consistent app-wide.
 */
export default function ResourcesLayout() {
  const { t } = useLingui();

  const tabs = [
    { label: t`AI Edge`, href: edgeRoutes.list(), icon: Gauge },
    { label: t`DNS`, href: dnsRoutes.list(), icon: Signpost },
    { label: t`Domains`, href: domainRoutes.list(), icon: Layers },
  ];

  return (
    <div
      className="bg-card flex flex-col overflow-hidden"
      style={{ height: `calc(100svh - ${HEADER_STACK_H}px)` }}>
      <div className="shrink-0 px-6 pt-4 pb-1">
        <nav className={tabStripClass}>
          {tabs.map((tab) => (
            <NavLink
              key={tab.href}
              to={tab.href}
              className={({ isActive }) => cn(tabBase, isActive ? tabActive : tabIdle)}>
              <Icon icon={tab.icon} className="shrink-0" />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
