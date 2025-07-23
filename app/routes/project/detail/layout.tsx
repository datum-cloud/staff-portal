import type { Route } from './+types/layout';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { projectDetailQuery } from '@/resources/request/server/project.request';
import { Project } from '@/resources/schemas/project.schema';
import { useLingui } from '@lingui/react/macro';
import { FileText, Waypoints } from 'lucide-react';
import { Outlet, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: Project) => <span>{data.metadata.name}</span>,
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await projectDetailQuery(session?.accessToken ?? '', params?.projectName ?? '');

  return data;
};

export default function Layout() {
  const { t } = useLingui();
  const data = useLoaderData() as Project;

  const menuItems = [
    {
      title: t`Overview`,
      href: `/projects/${data.metadata.name}`,
      icon: FileText,
    },
    {
      title: t`HTTP Proxy`,
      href: `/projects/${data.metadata.name}/http-proxies`,
      icon: Waypoints,
    },
  ];

  return (
    <SubLayout>
      <SubLayout.SidebarLeft>
        <SubLayout.SidebarMenu menuItems={menuItems} />
      </SubLayout.SidebarLeft>
      <SubLayout.Content>
        <Outlet />
      </SubLayout.Content>
    </SubLayout>
  );
}
