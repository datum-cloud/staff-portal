import { type BreadcrumbOptions } from '@/components/breadcrumb';
import { marketingSectionSwitcher } from '@/routes/marketing/breadcrumb-switchers';
import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: (): BreadcrumbOptions => ({
    label: <Trans>Contacts</Trans>,
    switcher: marketingSectionSwitcher,
  }),
};

export default function Layout() {
  return <Outlet />;
}
