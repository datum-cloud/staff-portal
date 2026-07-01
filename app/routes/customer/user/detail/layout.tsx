import type { Route } from './+types/layout';
import { DetailShell, type EntityTab } from '@/features/milo';
import { authenticator } from '@/modules/auth';
import { userDetailQuery } from '@/resources/request/server';
import { userRoutes } from '@/utils/config/routes.config';
import { Avatar, AvatarFallback } from '@datum-cloud/datum-ui/avatar';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { Building2, Contact, FileText, MailSearch, SquareActivity } from 'lucide-react';
import { useLoaderData } from 'react-router';

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

  const userId = data.metadata?.name ?? '';
  const fullName = `${data.spec?.givenName ?? ''} ${data.spec?.familyName ?? ''}`.trim();
  const initials =
    fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || '?';

  const tabs: EntityTab[] = [
    {
      label: t`Overview`,
      href: userRoutes.detail(userId),
      icon: FileText,
      end: true,
    },
    {
      label: t`Organizations`,
      href: userRoutes.organization(userId),
      icon: Building2,
    },
    { label: t`Contacts`, href: userRoutes.contacts(userId), icon: Contact },
    {
      label: t`Email Activity`,
      href: userRoutes.emailActivity(userId),
      icon: MailSearch,
    },
    {
      label: t`Activity`,
      icon: SquareActivity,
      match: userRoutes.activity.root(userId),
      children: [
        { label: t`Feed`, href: userRoutes.activity.root(userId) },
        { label: t`Audit Logs`, href: userRoutes.activity.auditLogs(userId) },
      ],
    },
  ];

  return (
    <DetailShell
      icon={
        <Avatar className="size-10 rounded-md">
          <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
        </Avatar>
      }
      name={fullName || userId}
      subtitle={data.spec?.email}
      tabs={tabs}
    />
  );
}
