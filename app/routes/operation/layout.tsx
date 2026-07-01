import { type BreadcrumbOptions } from '@/components/breadcrumb';
import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: (): BreadcrumbOptions => ({
    label: <Trans>Operations</Trans>,
    clickable: false,
  }),
};

export default function Layout() {
  return <Outlet />;
}
