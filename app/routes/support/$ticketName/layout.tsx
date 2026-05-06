import type { Route } from './+types/layout';
import { authenticator } from '@/modules/auth';
import { supportTicketDetailQuery } from '@/resources/request/server';
import type { ComMiloApisSupportV1Alpha1SupportTicket } from '@openapi/support.miloapis.com/v1alpha1';
import { Outlet, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ComMiloApisSupportV1Alpha1SupportTicket) => {
    return <span>{data?.spec?.title || data?.metadata?.name}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  return supportTicketDetailQuery(session?.accessToken ?? '', params.ticketName ?? '');
};

export default function Layout() {
  // Loader data makes the breadcrumb work — consumed by handle.breadcrumb above.
  useLoaderData<typeof loader>();
  return <Outlet />;
}
