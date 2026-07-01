import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Contact Groups</Trans>,
};

export default function Layout() {
  return <Outlet />;
}
