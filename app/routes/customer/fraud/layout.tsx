import { type BreadcrumbOptions } from '@/components/breadcrumb';
import { customerSectionSwitcher } from '@/routes/customer/breadcrumb-switchers';
import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: (): BreadcrumbOptions => ({
    label: <Trans>Fraud &amp; Abuse</Trans>,
    switcher: customerSectionSwitcher,
  }),
};

/**
 * Fraud & Abuse: Evaluations / Providers / Policy are switched with segmented
 * tabs in each page's search bar (`useFraudViews`), like the other Customers
 * list pages, so the layout adds no header of its own.
 */
export default function FraudLayout() {
  return <Outlet />;
}
