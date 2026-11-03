import {
  getAccountHealth,
  type AccountHealth,
  type UsageSpendComparison,
} from '../../lib/account-health';
import { getInvoicesForAccount, getPaymentMethodsForAccount, type Invoice } from '../../utils';
import { getPreviousCycleCutoff } from '@/modules/billing/billing-cycle';
import type { OrgUsageDashboardData } from '@/modules/billing/usage.types';
import {
  useBillingEntitlementForAccountQuery,
  useInvoiceListForOrgQuery,
  useOrgUsageDashboardQuery,
  usePaymentMethodListForOrgQuery,
} from '@/resources/request/client';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1PaymentMethod,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { useMemo } from 'react';

/**
 * Client data for the billing account dashboard. Each card calls the hooks
 * it needs; React Query shares the requests between cards, so the page
 * shell renders straight away and every card fills in as its data lands.
 */

type BillingAccount = ComMiloapisBillingV1Alpha1BillingAccount;

interface LoadState {
  isLoading: boolean;
  isError: boolean;
}

export interface AccountInvoices extends LoadState {
  /** This account's invoices; `undefined` until loaded. */
  invoices?: Invoice[];
  /** The org has more invoices than one page walk returns. */
  hasMore: boolean;
}

export function useAccountInvoices(orgName: string, accountName: string): AccountInvoices {
  const query = useInvoiceListForOrgQuery(orgName);
  const invoices = useMemo(
    () => (query.data ? getInvoicesForAccount(query.data.items, accountName) : undefined),
    [query.data, accountName]
  );
  return {
    invoices,
    hasMore: query.data?.hasMore ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export interface AccountPaymentMethods extends LoadState {
  /** This account's payment methods; `undefined` until loaded. */
  paymentMethods?: ComMiloapisBillingV1Alpha1PaymentMethod[];
}

export function useAccountPaymentMethods(
  orgName: string,
  account: BillingAccount
): AccountPaymentMethods {
  const query = usePaymentMethodListForOrgQuery(orgName);
  const accountName = account.metadata?.name ?? '';
  const namespace = account.metadata?.namespace;
  const paymentMethods = useMemo(
    () =>
      query.data
        ? getPaymentMethodsForAccount(query.data.items, accountName, namespace)
        : undefined,
    [query.data, accountName, namespace]
  );
  return { paymentMethods, isLoading: query.isLoading, isError: query.isError };
}

/** Spend from a usage dashboard response, or `undefined` when it couldn't be priced. */
const spendAmount = (data: OrgUsageDashboardData | undefined): number | undefined =>
  data?.usage.status === 'ok' && !data.usage.spendError
    ? (data.usage.spend?.amount ?? 0)
    : undefined;

export interface AccountUsageSpend extends LoadState {
  /** This cycle's usage, scoped to the account. */
  current?: OrgUsageDashboardData;
  /** Spend so far against last cycle's at the same point; `undefined` until both load. */
  comparison?: UsageSpendComparison;
}

/**
 * This cycle's usage for the account, and the previous cycle cut at the same
 * point for the "vs last cycle" trend. `now` must be stable across renders
 * (it is part of the previous cycle's query key).
 */
export function useAccountUsageSpend(
  orgName: string,
  account: BillingAccount,
  now: Date
): AccountUsageSpend {
  const accountName = account.metadata?.name ?? '';
  const terms = account.spec?.paymentTerms;
  const until = useMemo(() => getPreviousCycleCutoff(terms, now).toISOString(), [terms, now]);
  const enabled = Boolean(orgName && accountName);

  const current = useOrgUsageDashboardQuery(orgName, 'all', 'current', {
    scope: { billingAccount: accountName },
    enabled,
  });
  const previous = useOrgUsageDashboardQuery(orgName, 'all', 'previous', {
    scope: { billingAccount: accountName, until },
    enabled,
  });

  const comparison = useMemo((): UsageSpendComparison | undefined => {
    const currentSpend = spendAmount(current.data);
    const previousSpend = spendAmount(previous.data);
    if (currentSpend === undefined || previousSpend === undefined) return undefined;
    return {
      current: currentSpend,
      previous: previousSpend,
      currency: current.data?.usage.spend?.currency ?? account.spec?.currencyCode ?? 'USD',
    };
  }, [current.data, previous.data, account.spec?.currencyCode]);

  return {
    current: current.data,
    comparison,
    isLoading: current.isLoading || previous.isLoading,
    isError: current.isError,
  };
}

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
  const invoices = useAccountInvoices(orgName, accountName);
  const paymentMethods = useAccountPaymentMethods(orgName, account);
  const entitlement = useBillingEntitlementForAccountQuery(orgName, accountName);
  const usage = useAccountUsageSpend(orgName, account, now);

  const health = useMemo(
    () =>
      getAccountHealth({
        account,
        invoices: invoices.invoices,
        paymentMethods: paymentMethods.paymentMethods,
        entitlement: entitlement.data,
        usage: usage.comparison,
        now,
      }),
    [
      account,
      invoices.invoices,
      paymentMethods.paymentMethods,
      entitlement.data,
      usage.comparison,
      now,
    ]
  );

  return {
    health,
    isLoading:
      invoices.isLoading || paymentMethods.isLoading || entitlement.isLoading || usage.isLoading,
  };
}
