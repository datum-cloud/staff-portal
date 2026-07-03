import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Service Catalog</Trans>,
};

export default function ServiceCatalogLayout() {
  return <Outlet />;
}
