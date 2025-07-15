import type { Route } from './+types/public.layout';
import { AppSidebar } from '@/components/app-sidebar';
import AppToolbar from '@/components/app-toolbar';
import AppTopbar from '@/components/app-topbar';
import { authenticator } from '@/modules/auth';
import { SidebarInset, SidebarProvider } from '@/modules/shadcn/ui/sidebar';
import { AppProvider } from '@/providers/app.provider';
import { authUserQuery } from '@/resources/request/server/auth.request';
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

  const isValid = await authenticator.isValidSession(request);
  if (!isValid) {
    return redirect('/logout');
  }

  const session = await authenticator.getSession(request);
  const user = await authUserQuery(session?.accessToken ?? '');

  return data({ user });
}

export default function PrivateLayout() {
  const data = useLoaderData<typeof loader>();

  return (
    <AppProvider user={data.user ?? undefined}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppTopbar />
          <AppToolbar />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </AppProvider>
  );
}
