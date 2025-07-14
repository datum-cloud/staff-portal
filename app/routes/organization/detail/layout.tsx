import type { Route } from './+types/layout';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth/auth.server';
import { orgDetailQuery } from '@/resources/request/server/organization.request';
import { Organization } from '@/resources/schemas/organization.schema';
import { FileText, Folders } from 'lucide-react';
import { Outlet } from 'react-router';

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
  const menuItems = [
    {
      title: 'Overview',
      href: '',
      icon: FileText,
    },
    {
      title: 'Projects',
      href: './projects',
      icon: Folders,
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
