import { getBillingAccountDisplayName, getOrganizationDisplayName } from '@/features/billing/utils';
import { authenticator } from '@/modules/auth';
import { billingAccountDetailRequest, orgDetailQuery } from '@/resources/request/server';
import { Outlet, useLoaderData, type LoaderFunctionArgs } from 'react-router';

export const handle = {
  breadcrumb: (data: Awaited<ReturnType<typeof loader>>) => {
    const displayName = data?.account ? getBillingAccountDisplayName(data.account) : '';
    return <span>{displayName || data?.account?.metadata?.name}</span>;
  },
};

/**
 * Only what the breadcrumb and page header need. The dashboard's cards load
 * invoices, payment methods, usage and the rest on the client, so the route
 * change doesn't wait on them.
 */
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const session = await authenticator.getSession(request);
  const token = session?.accessToken ?? '';
  const orgName = params.orgName ?? '';
  const accountName = params.accountName ?? '';
  const empty = { account: null, orgName, orgDisplayName: orgName };

  if (!orgName || !accountName) return empty;

  try {
    const [account, organization] = await Promise.all([
      billingAccountDetailRequest(token, orgName, accountName),
      orgDetailQuery(token, orgName).catch(() => undefined),
    ]);
    return {
      account,
      orgName,
      orgDisplayName: organization ? getOrganizationDisplayName(organization) : orgName,
    };
  } catch {
    return empty;
  }
};

export default function Layout() {
  useLoaderData<typeof loader>();
  return <Outlet />;
}
