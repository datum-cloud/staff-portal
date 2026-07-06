import { type BreadcrumbOptions } from '@/components/breadcrumb';
import { customerSectionSwitcher } from '@/routes/customer/breadcrumb-switchers';
import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: (): BreadcrumbOptions => ({
    label: <Trans>Users</Trans>,
    switcher: customerSectionSwitcher,
  }),
};

export default function Layout() {
  return <Outlet />;
}
