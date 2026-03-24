import type { Route } from './+types/layout';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { orgDetailQuery } from '@/resources/request/server';
import { orgRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { CircleGauge, FileText, Folders, SquareActivity, Users } from 'lucide-react';
import { Outlet, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ComMiloapisResourcemanagerV1Alpha1Organization) => {
    const displayName =
      data?.metadata?.annotations?.['kubernetes.io/display-name'] || data?.metadata?.name;
    return <span>{displayName}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await orgDetailQuery(session?.accessToken ?? '', params?.orgName ?? '');

  return data;
};

export default function Layout() {
  const { t } = useLingui();
  const data = useLoaderData<typeof loader>();

  const menuItems = [
    {
      title: t`Overview`,
      href: orgRoutes.detail(data?.metadata?.name ?? ''),
      icon: FileText,
    },
    {
      title: t`Projects`,
      href: orgRoutes.project(data?.metadata?.name ?? ''),
      icon: Folders,
    },
    {
      title: t`Activity`,
      href: orgRoutes.activity.root(data?.metadata?.name ?? ''),
      icon: SquareActivity,
    },
    {
      title: t`Members`,
      href: orgRoutes.member(data?.metadata?.name ?? ''),
      icon: Users,
    },
    {
      title: t`Quotas`,
      icon: CircleGauge,
      hasSubmenu: true,
      submenuItems: [
        {
          title: t`Usage`,
          href: `${orgRoutes.quota.usage(data?.metadata?.name ?? '')}`,
        },
        {
          title: t`Grants`,
          href: orgRoutes.quota.grant(data?.metadata?.name ?? ''),
        },
      ],
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
