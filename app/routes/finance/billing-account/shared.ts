import { loader } from './detail/layout';
import { getBillingAccountDisplayName } from '@/features/billing/utils';
import { extractDataFromMatches } from '@/utils/helpers';
import { useRouteLoaderData } from 'react-router';

export type BillingAccountDetailLoaderData = Awaited<ReturnType<typeof loader>>;

export function useBillingAccountDetailData() {
  return useRouteLoaderData(
    'routes/finance/billing-account/detail/layout'
  ) as BillingAccountDetailLoaderData;
}

export function getBillingAccountDetailMetadata(
  matches: Parameters<typeof extractDataFromMatches>[0]
) {
  const data = extractDataFromMatches<BillingAccountDetailLoaderData>(
    matches,
    'routes/finance/billing-account/detail/layout'
  );
  return {
    ...data,
    displayName: data?.account ? getBillingAccountDisplayName(data.account) : '',
    accountName: data?.account?.metadata?.name ?? '',
  };
}
