import type { Route } from './+types/public.layout';
import { AppSidebar } from '@/components/app-sidebar';
import AppTopbar from '@/components/app-topbar';
import { authenticator } from '@/modules/auth/auth.server';
import { SidebarInset, SidebarProvider } from '@/modules/shadcn/ui/sidebar';
import { AuthProvider } from '@/providers/auth.provider';
import { authUserQuery } from '@/resources/api/auth.resource';
import { metaObject } from '@/utils/helpers';
import { data, Outlet, redirect, useLoaderData } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Dashboard');
};

export async function loader({ request }: Route.LoaderArgs) {
  const isAuthenticated = await authenticator.isAuthenticated(request);
  if (!isAuthenticated) {
    return redirect('/login');
  }

  // Get user from session
  const session = await authenticator.getSession(request);
  const user = await authUserQuery(session?.accessToken ?? '');
  return data({ user, token: session?.accessToken });
}

export default function PrivateLayout() {
  const data = useLoaderData<typeof loader>();

  return (
    <AuthProvider user={data.user} token={data.token}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppTopbar />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </AuthProvider>
  );
}
