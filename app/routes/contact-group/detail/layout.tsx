import type { Route } from './+types/layout';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { contactGroupDetailQuery } from '@/resources/request/server';
import { ContactGroup } from '@/resources/schemas';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { InfoIcon, Users } from 'lucide-react';
import { Outlet, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ContactGroup) => {
    const displayName = data.spec.displayName || data.metadata.name;
    return <span>{displayName}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await contactGroupDetailQuery(
    session?.accessToken ?? '',
    params?.contactGroupName ?? ''
  );

  return data;
};

export default function Layout() {
  const { t } = useLingui();
  const data = useLoaderData() as ContactGroup;

  const menuItems = [
    {
      title: t`Details`,
      href: contactGroupRoutes.detail(data.metadata.name),
      icon: InfoIcon,
    },
    {
      title: t`Members`,
      href: contactGroupRoutes.member(data.metadata.name),
      icon: Users,
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
