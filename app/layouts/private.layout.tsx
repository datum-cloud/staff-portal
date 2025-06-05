import type { Route } from './+types/public.layout';
import { AppSidebar } from '@/components/app-sidebar';
import AppTopbar from '@/components/app-topbar';
import { authenticator } from '@/modules/auth/auth.server';
import { SidebarInset, SidebarProvider } from '@/modules/shadcn/ui/sidebar';
import { metaObject } from '@/utils/helpers';
import { Outlet, redirect } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Dashboard');
};

export async function loader({ request }: Route.LoaderArgs) {
  const isAuthenticated = await authenticator.isAuthenticated(request);
  if (!isAuthenticated) {
    return redirect('/login');
  }

  return null;
}

export default function PrivateLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppTopbar />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
