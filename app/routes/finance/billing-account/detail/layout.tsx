import { getBillingAccountDisplayName } from '@/features/billing/utils';
import { authenticator } from '@/modules/auth';
import { billingAccountDetailBundleRequest } from '@/resources/request/server';
import { Outlet, useLoaderData, type LoaderFunctionArgs } from 'react-router';

export const handle = {
  breadcrumb: (data: Awaited<ReturnType<typeof loader>>) => {
    const displayName = data?.account ? getBillingAccountDisplayName(data.account) : '';
    return <span>{displayName || data?.account?.metadata?.name}</span>;
  },
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const session = await authenticator.getSession(request);
  const orgName = params.orgName ?? '';
  const accountName = params.accountName ?? '';

  if (!orgName || !accountName) {
    return { account: null, bindings: [], paymentMethods: [], orgName };
  }

  try {
    return await billingAccountDetailBundleRequest(
      session?.accessToken ?? '',
      orgName,
      accountName
    );
  } catch {
    return { account: null, bindings: [], paymentMethods: [], orgName };
  }
};

export default function Layout() {
  useLoaderData<typeof loader>();
  return <Outlet />;
}
