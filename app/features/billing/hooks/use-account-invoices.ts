import { getInvoicesForAccount, type BillingAccount, type Invoice } from '../utils';
import type { LoadState } from './load-state';
import { useInvoiceListForOrgQuery } from '@/resources/request/client';
import { useMemo } from 'react';

export interface AccountInvoices extends LoadState {
  /** This account's invoices, stale ones left out; `undefined` until loaded. */
  invoices?: Invoice[];
  /** The org has more invoices than one page walk returns. */
  hasMore: boolean;
}

/** The account's invoices, from the org's list that every card shares. */
export function useAccountInvoices(orgName: string, account: BillingAccount): AccountInvoices {
  const accountName = account.metadata?.name ?? '';
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
