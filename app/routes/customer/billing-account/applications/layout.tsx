import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Applications</Trans>,
};

/**
 * Payment terms applications: the review queue (a view tab beside
 * Accounts) and each application's page.
 */
export default function Layout() {
  return <Outlet />;
}
