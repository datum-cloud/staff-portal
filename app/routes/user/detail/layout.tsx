import type { Route } from './+types/layout';
import { authenticator } from '@/modules/auth/auth.server';
import { userDetailQuery } from '@/resources/request/server/user.request';
import { User } from '@/resources/schemas/user.schema';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: (data: User) => (
    <span>
      {data.spec.givenName} {data.spec.familyName}
    </span>
  ),
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await userDetailQuery(session?.accessToken ?? '', params?.userId ?? '');

  return data;
};

export default function Layout() {
  return <Outlet />;
}
