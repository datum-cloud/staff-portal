import { useAccountInvoices, useAccountPaymentMethods } from '../../hooks';
import { isPastDueInvoice } from '../../lib/invoice-summary';
import { getBillingAccountDisplayStatus, type BillingAccount } from '../../utils';
import { BadgeState } from '@/components/badge';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { t } from '@lingui/core/macro';

/**
 * The account's status, as the header and the Configuration card show it.
 * Past due outranks the account phase: it's the first thing staff need to
 * know, so the badge waits for invoices, and says so when they fail to load.
 */
export function AccountStatusBadge({
  orgName,
  account,
}: {
  orgName: string;
  account: BillingAccount;
}) {
  const invoices = useAccountInvoices(orgName, account);
  const { paymentMethods, isLoading } = useAccountPaymentMethods(orgName, account);

  if (invoices.invoices?.some(isPastDueInvoice)) {
    return <BadgeState state="error" message={t`Past due`} />;
  }
  // Without invoices there's no telling whether anything is past due.
  if (invoices.isError) {
    return <BadgeState state="unknown" message={t`Unknown`} tooltip={t`Couldn't load invoices`} />;
  }
  if (isLoading || invoices.isLoading) {
    return <Skeleton className="h-4 w-14 rounded" />;
  }
  const status = getBillingAccountDisplayStatus(account, paymentMethods ?? []);
  return <BadgeState state={status.state} tooltip={status.tooltip} />;
}
