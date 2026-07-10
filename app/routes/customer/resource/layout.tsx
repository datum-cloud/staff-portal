import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Resources</Trans>,
};

/**
 * Customers → Resources: a single merged list of AI Edge / DNS / Domains
 * resources across all projects, with Type as a sidebar filter rather than a
 * tab bar — see `index.tsx`.
 */
export default function ResourcesLayout() {
  return <Outlet />;
}
