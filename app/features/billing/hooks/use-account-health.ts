import { getAccountHealth, type AccountHealth } from '../lib/account-health';
import type { BillingAccount } from '../utils';
import { useAccountInvoices } from './use-account-invoices';
import { useAccountPaymentMethods } from './use-account-payment-methods';
import { useAccountUsageSpend } from './use-account-usage';
import { useBillingEntitlementForAccountQuery } from '@/resources/request/client';
import { useMemo } from 'react';

export interface AccountHealthState {
  health: AccountHealth;
  /** Some check's data is still loading. */
  isLoading: boolean;
}

/** Every attention check, re-run as each input arrives. */
export function useAccountHealth(
  orgName: string,
  account: BillingAccount,
  now: Date
): AccountHealthState {
  const accountName = account.metadata?.name ?? '';
  const invoices = useAccountInvoices(orgName, account);
  const paymentMethods = useAccountPaymentMethods(orgName, account);
  const entitlement = useBillingEntitlementForAccountQuery(orgName, accountName);
  const usage = useAccountUsageSpend(orgName, account);

  const health = useMemo(
    () =>
      getAccountHealth({
        account,
        invoices: invoices.invoices,
        paymentMethods: paymentMethods.paymentMethods,
        entitlement: entitlement.data,
        usage: usage.comparison,
        invoicesComplete: !invoices.hasMore,
        now,
      }),
    [
      account,
      invoices.invoices,
      paymentMethods.paymentMethods,
      entitlement.data,
      usage.comparison,
      invoices.hasMore,
      now,
    ]
  );

  return {
    health,
    isLoading:
      invoices.isLoading ||
      paymentMethods.isLoading ||
      entitlement.isLoading ||
      usage.isLoading ||
      usage.isComparisonLoading,
  };
}
