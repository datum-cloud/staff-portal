import type { Route } from './+types/layout';
import { EntityHeader, EntityTabNav, type EntityTab } from '@/features/milo';
import { authenticator } from '@/modules/auth';
import { useApp } from '@/providers/app.provider';
import { contactDetailQuery, userDetailQuery } from '@/resources/request/server';
import { ContactDetailLoaderData } from '@/routes/contact/shared';
import { contactRoutes } from '@/utils/config/routes.config';
import { Avatar, AvatarFallback } from '@datum-cloud/datum-ui/avatar';
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
  const { actions } = useApp();

  const namespace = data?.contact?.metadata?.namespace ?? '';
  const contactName = data?.contact?.metadata?.name ?? '';
  const displayName =
    [data?.contact?.spec?.givenName, data?.contact?.spec?.familyName].filter(Boolean).join(' ') ||
    contactName;
  const initials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || '?';

  const tabs: EntityTab[] = [
    {
      label: t`Details`,
      href: contactRoutes.detail(namespace, contactName),
      icon: InfoIcon,
      end: true,
    },
    {
      label: t`Lists`,
      href: contactRoutes.group(namespace, contactName),
      icon: BookUser,
    },
  ];

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4">
        <EntityHeader
          icon={
            <Avatar className="size-10 rounded-md">
              <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
            </Avatar>
          }
          name={displayName}
          subtitle={data?.contact?.spec?.email}
          actions={actions}
        />
      </div>
      <EntityTabNav tabs={tabs} />
      <Outlet />
    </div>
  );
}
