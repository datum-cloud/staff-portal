import { getApplicationPhase } from '../lib/payment-terms-applications';
import type { ViewTab } from '@/features/milo';
import { useBillingArrangementApplicationListQuery } from '@/resources/request/client';
import { ENTITY_ICONS } from '@/utils/config/icons.config';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { ClipboardList } from 'lucide-react';

/**
 * Billing Accounts' views, as segmented tabs on each of its list pages. The
 * Applications tab counts the payment terms applications waiting for a
 * decision.
 */
export function useBillingAccountViews(): ViewTab[] {
  const { t } = useLingui();
  const applicationsQuery = useBillingArrangementApplicationListQuery();
  const pending = (applicationsQuery.data?.items ?? []).filter(
    (application) => getApplicationPhase(application) === 'Pending'
  ).length;
  return [
    {
      label: t`Accounts`,
      href: billingAccountRoutes.list(),
      icon: ENTITY_ICONS.billingAccount,
      end: true,
    },
    {
      label: t`Applications`,
      href: billingAccountRoutes.applications.list(),
      icon: ClipboardList,
      count: pending,
    },
  ];
}
