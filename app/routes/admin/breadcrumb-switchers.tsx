import { type BreadcrumbSwitcherOption } from '@/components/breadcrumb';
import { groupRoutes, offerRoutes, serviceCatalogRoutes } from '@/utils/config/routes.config';
import { Trans } from '@lingui/react/macro';

export const adminSectionSwitcher: BreadcrumbSwitcherOption[] = [
  { label: <Trans>Groups</Trans>, path: groupRoutes.list() },
  { label: <Trans>Service Catalog</Trans>, path: serviceCatalogRoutes.list() },
  { label: <Trans>Offers</Trans>, path: offerRoutes.list() },
];
