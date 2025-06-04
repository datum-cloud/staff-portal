import type { Route } from './+types/public.layout';
import { authenticator } from '@/modules/auth/auth.server';
import { Outlet, redirect } from 'react-router';

export async function loader({ request }: Route.LoaderArgs) {
  const isAuthenticated = await authenticator.isAuthenticated(request);
  if (isAuthenticated) {
    const session = await authenticator.getSession(request);
    return redirect('/', { headers: session?.headers });
  }

  return null;
}

export default function PublicLayout() {
  return <Outlet />;
}
