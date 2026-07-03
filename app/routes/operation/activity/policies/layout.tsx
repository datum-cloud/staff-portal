import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Policies</Trans>,
};

export default function PoliciesLayout() {
  return <Outlet />;
}
