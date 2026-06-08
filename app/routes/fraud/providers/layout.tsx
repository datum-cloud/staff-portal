import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Providers</Trans>,
};

export default function ProvidersLayout() {
  return <Outlet />;
}
