import { isPastDueInvoice } from '../../lib/invoice-summary';
import { getBillingAccountDisplayStatus } from '../../utils';
import { useAccountInvoices, useAccountPaymentMethods } from './use-account-dashboard';
import { BadgeState } from '@/components/badge';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { t } from '@lingui/core/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';

/**
 * The account's status, as the header and the Configuration card show it.
 * Past due outranks the account phase: it's the first thing staff need to
 * know. Until payment methods load, a placeholder.
 */
export function AccountStatusBadge({
  orgName,
  account,
}: {
  orgName: string;
  account: ComMiloapisBillingV1Alpha1BillingAccount;
}) {
  const { invoices } = useAccountInvoices(orgName, account.metadata?.name ?? '');
  const { paymentMethods, isLoading } = useAccountPaymentMethods(orgName, account);

  if (invoices?.some(isPastDueInvoice)) {
    return <BadgeState state="error" message={t`Past due`} />;
  }
  if (isLoading) {
    return <Skeleton className="h-4 w-14 rounded" />;
  }
  const status = getBillingAccountDisplayStatus(account, paymentMethods ?? []);
  return <BadgeState state={status.state} tooltip={status.tooltip} />;
}
