import { tabActive, tabBase, tabIdle, tabStripClass } from '@/features/milo';
import { dnsRoutes, domainRoutes, edgeRoutes } from '@/utils/config/routes.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useLingui } from '@lingui/react/macro';
import { Gauge, Layers, Signpost } from 'lucide-react';
import { NavLink } from 'react-router';

/**
 * Tab bar for the Customers → Resources page: AI Edge / DNS / Domains. The three
 * global lists live at separate paths (`/edges`, `/dns`, `/domains`); each renders
 * this bar (via `<ListPage tabs>`) so they read as one tabbed "Resources" view.
 * Reuses the detail-page (`EntityTabNav`) segmented style so tabs look consistent.
 */
export function ResourceTabs() {
  const { t } = useLingui();

  const tabs = [
    { label: t`AI Edge`, href: edgeRoutes.list(), icon: Gauge },
    { label: t`DNS`, href: dnsRoutes.list(), icon: Signpost },
    { label: t`Domains`, href: domainRoutes.list(), icon: Layers },
  ];

  return (
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
  );
}
