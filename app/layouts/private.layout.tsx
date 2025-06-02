import type { Route } from './+types/public.layout';
import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/modules/shadcn/ui/breadcrumb';
import { Separator } from '@/modules/shadcn/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/modules/shadcn/ui/sidebar';
import { sessionCookie } from '@/utils/cookies';
import { metaObject } from '@/utils/helpers';
import { useLingui } from '@lingui/react/macro';
import React from 'react';
import { Outlet, redirect, useMatches } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Dashboard');
};

export async function loader({ request }: Route.LoaderArgs) {
  const session = await sessionCookie.get(request);
  if (!session?.data) {
    return redirect('/login');
  }

  return null;
}

export default function PrivateLayout() {
  const { t } = useLingui();
  const matches = useMatches();
  const crumbs = matches
    .filter((match: any) => Boolean(match.handle?.breadcrumb))
    .map((match: any) => ({
      path: match.pathname,
      name: match.handle.breadcrumb(match.data),
    }));

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">{t`Dashboard`}</BreadcrumbLink>
                </BreadcrumbItem>
                {crumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.path}>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      {idx === crumbs.length - 1 ? (
                        <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.path}>{crumb.name}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
