import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Offers</Trans>,
};

export default function OfferLayout() {
  return <Outlet />;
}
