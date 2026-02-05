import type { Route } from './+types/layout';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { contactDetailQuery, userDetailQuery } from '@/resources/request/server';
import { ContactDetailLoaderData } from '@/routes/contact/shared';
import { contactRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { BookUser, InfoIcon } from 'lucide-react';
import { Outlet, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ContactDetailLoaderData) => {
    const displayName = [data.contact?.spec?.givenName, data.contact?.spec?.familyName]
      .filter(Boolean)
      .join(' ');
    const contactName = data.contact?.metadata?.name ?? '';

    return <span>{displayName || contactName}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const contact = await contactDetailQuery(
    session?.accessToken ?? '',
    params?.contactName ?? '',
    params?.namespace ?? ''
  );

  let user: ComMiloapisIamV1Alpha1User | undefined;
  if (contact?.spec?.subject?.name && contact?.spec?.subject?.kind === 'User') {
    user = await userDetailQuery(session?.accessToken ?? '', contact?.spec?.subject?.name ?? '');
  }

  return { contact, user };
};

export default function Layout() {
  const { t } = useLingui();
  const data = useLoaderData<typeof loader>();

  const menuItems = [
    {
      title: t`Details`,
      href: contactRoutes.detail(
        data?.contact?.metadata?.namespace ?? '',
        data?.contact?.metadata?.name ?? ''
      ),
      icon: InfoIcon,
    },
    {
      title: t`Groups`,
      href: contactRoutes.group(
        data?.contact?.metadata?.namespace ?? '',
        data?.contact?.metadata?.name ?? ''
      ),
      icon: BookUser,
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
