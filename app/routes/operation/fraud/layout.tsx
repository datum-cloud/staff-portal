import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Fraud &amp; Abuse</Trans>,
};

// The Milo shell renders the Evaluations/Providers/Policy sub-nav from
// NAV_SECTIONS (`fraud`); this layout just hosts the routed content.
export default function FraudLayout() {
  return <Outlet />;
}
