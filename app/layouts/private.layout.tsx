import type { Route } from './+types/public.layout';
import AppSidebar from '@/components/sidebar';
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
import { Outlet, redirect } from 'react-router';

export async function loader({ request }: Route.LoaderArgs) {
  const session = await sessionCookie.get(request);
  if (!session?.data) {
    return redirect('/login');
  }

  return null;
}

export default function PublicLayout() {
  return (
    // <SidebarProvider>
    //   <AppSidebar />
    //   <SidebarInset>
    //     <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
    //       <div className="flex items-center gap-2 px-4">
    //         <SidebarTrigger className="-ml-1" />
    //         <Separator orientation="vertical" className="mr-2 h-4" />
    //         <Breadcrumb>
    //           <BreadcrumbList>
    //             <BreadcrumbItem className="hidden md:block">
    //               <BreadcrumbLink href="#">Building Your Application</BreadcrumbLink>
    //             </BreadcrumbItem>
    //             <BreadcrumbSeparator className="hidden md:block" />
    //             <BreadcrumbItem>
    //               <BreadcrumbPage>Data Fetching</BreadcrumbPage>
    //             </BreadcrumbItem>
    //           </BreadcrumbList>
    //         </Breadcrumb>
    //       </div>
    //     </header>
    //     <Outlet />
    //   </SidebarInset>
    // </SidebarProvider>
    <Outlet />
  );
}
