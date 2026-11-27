import { getBillingAccountDisplayName, getOrganizationDisplayName } from '@/features/billing/utils';
import type { EntityNav } from '@/features/milo';
import { authenticator } from '@/modules/auth';
import { billingAccountDetailRequest, orgDetailQuery } from '@/resources/request/server';
import { ENTITY_ICONS, TAB_ICONS } from '@/utils/config/icons.config';
import { billingAccountRoutes } from '@/utils/config/routes.config';
import { FileText, ReceiptText } from 'lucide-react';
import { Outlet, useLoaderData, type LoaderFunctionArgs } from 'react-router';

export const handle = {
  // The account's left rail, as other detail pages have: its overview, and
  // the sections long enough for a page of their own. `handle` is module
  // scope, so the labels are plain strings, as in `NAV_SECTIONS`.
  entityNav: (
    data: Awaited<ReturnType<typeof loader>>,
    params: { orgName?: string; accountName?: string }
  ): EntityNav => {
    const orgName = params.orgName ?? data?.orgName ?? '';
    const accountName = params.accountName ?? data?.account?.metadata?.name ?? '';
    return {
      backTo: { label: 'Billing Accounts', href: billingAccountRoutes.list() },
      title: (data?.account && getBillingAccountDisplayName(data.account)) || accountName,
      icon: ENTITY_ICONS.billingAccount,
      groups: [
        {
          items: [
            {
              label: 'Overview',
              href: billingAccountRoutes.detail(orgName, accountName),
              icon: TAB_ICONS.overview,
            },
            {
              label: 'Invoices',
              href: billingAccountRoutes.invoices(orgName, accountName),
              icon: FileText,
            },
            {
              label: 'Charges',
              href: billingAccountRoutes.charges(orgName, accountName),
              icon: ReceiptText,
            },
            {
              label: 'Activity',
              href: billingAccountRoutes.activity(orgName, accountName),
              icon: ENTITY_ICONS.activity,
            },
          ],
        },
      ],
    };
  },
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
