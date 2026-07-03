import { EntityTabNav, type EntityTab } from '@/features/milo';
import { ENTITY_ICONS } from '@/utils/config/icons.config';
import { dnsRoutes, domainRoutes, edgeRoutes } from '@/utils/config/routes.config';
import { Trans, useLingui } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Resources</Trans>,
};

/**
 * Customers → Resources: AI Edge / DNS / Domains tabs. Same tab bar as fraud/
 * detail pages, but no EntityHeader — there's no section-level action to host.
 * The three global lists (their own routes) render into the content below.
 */
export default function ResourcesLayout() {
  const { t } = useLingui();

  const tabs: EntityTab[] = [
    { label: t`AI Edge`, href: edgeRoutes.list(), icon: ENTITY_ICONS.edge },
    { label: t`DNS`, href: dnsRoutes.list(), icon: ENTITY_ICONS.dns },
    { label: t`Domains`, href: domainRoutes.list(), icon: ENTITY_ICONS.domain },
  ];

  return (
    <div className="flex flex-col">
      <EntityTabNav tabs={tabs} />
      <Outlet />
    </div>
  );
}
