import type { Route } from './+types/layout';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { orgDetailQuery } from '@/resources/request/server/organization.request';
import { Organization } from '@/resources/schemas/organization.schema';
import { orgRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { FileText, Folders, SquareActivity } from 'lucide-react';
import { Outlet, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: Organization) => (
    <span>{data.metadata.annotations?.['kubernetes.io/display-name']}</span>
  ),
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await orgDetailQuery(session?.accessToken ?? '', params?.orgName ?? '');

  return data;
};

export default function Layout() {
  const { t } = useLingui();
  const data = useLoaderData() as Organization;

  const menuItems = [
    {
      title: t`Overview`,
      href: orgRoutes.detail(data.metadata.name),
      icon: FileText,
    },
    {
      title: t`Projects`,
      href: orgRoutes.projects(data.metadata.name),
      icon: Folders,
    },
    {
      title: t`Activity`,
      href: orgRoutes.activity(data.metadata.name),
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
