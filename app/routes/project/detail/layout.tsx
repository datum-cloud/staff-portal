import type { Route } from './+types/layout';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { projectDetailQuery } from '@/resources/request/server/project.request';
import { Project } from '@/resources/schemas/project.schema';
import { projectRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { FileText, SquareActivity, Waypoints } from 'lucide-react';
import { Outlet, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: Project) => (
    <span>{data.metadata.annotations?.['kubernetes.io/description']}</span>
  ),
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
      href: projectRoutes.detail(data.metadata.name),
      icon: FileText,
    },
    {
      title: t`HTTP Proxies`,
      href: projectRoutes.httpProxy.list(data.metadata.name),
      icon: Waypoints,
    },
    {
      title: t`Activity`,
      href: projectRoutes.activity(data.metadata.name),
      icon: SquareActivity,
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
