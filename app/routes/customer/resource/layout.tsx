import { type BreadcrumbOptions } from '@/components/breadcrumb';
import { customerSectionSwitcher } from '@/routes/customer/breadcrumb-switchers';
import { Trans } from '@lingui/react/macro';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: (): BreadcrumbOptions => ({
    label: <Trans>Resources</Trans>,
    switcher: customerSectionSwitcher,
  }),
};

/**
 * Customers → Resources: a single merged list of ALB / DNS / Domains
 * resources across all projects, with Type as a sidebar filter rather than a
 * tab bar — see `index.tsx`.
 */
export default function ResourcesLayout() {
  return <Outlet />;
}
