import type { Route } from './+types/public.layout';
import { sessionCookie } from '@/utils/cookies';
import { Outlet, redirect } from 'react-router';

export async function loader({ request }: Route.LoaderArgs) {
  const session = await sessionCookie.get(request);
  if (!session?.data) {
    return redirect('/login');
  }

  return null;
}

export default function PublicLayout() {
  return <Outlet />;
}
