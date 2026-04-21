import type { Route } from './+types/layout';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { userDetailQuery } from '@/resources/request/server';
import { userRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { Building2, Contact, FileText, MailSearch, SquareActivity } from 'lucide-react';
import { Outlet, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ComMiloapisIamV1Alpha1User) => (
    <span>
      {data.spec?.givenName ?? ''} {data.spec?.familyName ?? ''}
    </span>
  ),
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await userDetailQuery(session?.accessToken ?? '', params?.userId ?? '');

  return data;
};

export default function Layout() {
  const { t } = useLingui();
  const data = useLoaderData<typeof loader>();

  const menuItems = [
    {
      title: t`Overview`,
      href: userRoutes.detail(data.metadata?.name ?? ''),
      icon: FileText,
    },
    {
      title: t`Organizations`,
      href: userRoutes.organization(data.metadata?.name ?? ''),
      icon: Building2,
    },
    {
      title: t`Contacts`,
      href: userRoutes.contacts(data.metadata?.name ?? ''),
      icon: Contact,
    },
    {
      title: t`Email Activity`,
      href: userRoutes.emailActivity(data.metadata?.name ?? ''),
      icon: MailSearch,
    },
    {
      title: t`Activity`,
      href: userRoutes.activity.root(data.metadata?.name ?? ''),
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
