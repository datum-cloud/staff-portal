import { type BreadcrumbOptions } from '@/components/breadcrumb';
import { adminSectionSwitcher } from '@/routes/admin/breadcrumb-switchers';
import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: (): BreadcrumbOptions => ({
    label: <Trans>Service Catalog</Trans>,
    switcher: adminSectionSwitcher,
  }),
};

export default function ServiceCatalogLayout() {
  return <Outlet />;
}
