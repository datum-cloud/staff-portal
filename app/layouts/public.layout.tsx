import type { Route } from './+types/public.layout';
import { getSession } from '@/modules/auth/session.server';
import { Outlet, redirect } from 'react-router';

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session.session) {
    return redirect('/', { headers: session.headers });
  }

  return null;
}

export default function PublicLayout() {
  return <Outlet />;
}
