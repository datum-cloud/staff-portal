import { getPaymentMethodsForAccount, type BillingAccount, type PaymentMethod } from '../utils';
import type { LoadState } from './load-state';
import { usePaymentMethodListForOrgQuery } from '@/resources/request/client';
import { useMemo } from 'react';

export interface AccountPaymentMethods extends LoadState {
  /** This account's payment methods; `undefined` until loaded. */
  paymentMethods?: PaymentMethod[];
}

/** The account's payment methods, from the org's list that every card shares. */
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
