import { HEADER_STACK_H, TabStrip, type EntityTab } from '@/features/milo';
import { dnsRoutes, domainRoutes, edgeRoutes } from '@/utils/config/routes.config';
import { Trans, useLingui } from '@lingui/react/macro';
import { Gauge, Layers, Signpost } from 'lucide-react';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Resources</Trans>,
};

/**
 * Customers → Resources: one page with an AI Edge / DNS / Domains tab bar. The
 * three global lists (their own routes) render into the content area below.
 * Reuses the shared `TabStrip` so tabs look consistent with detail pages.
 */
export default function ResourcesLayout() {
  const { t } = useLingui();

  const tabs: EntityTab[] = [
    { label: t`AI Edge`, href: edgeRoutes.list(), icon: Gauge },
    { label: t`DNS`, href: dnsRoutes.list(), icon: Signpost },
    { label: t`Domains`, href: domainRoutes.list(), icon: Layers },
  ];

  return (
    <div
      className="bg-card flex flex-col overflow-hidden"
      style={{ height: `calc(100svh - ${HEADER_STACK_H}px)` }}>
      <div className="shrink-0 px-6 pt-4 pb-1">
        <TabStrip tabs={tabs} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
