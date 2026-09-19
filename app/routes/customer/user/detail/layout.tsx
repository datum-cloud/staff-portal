import type { Route } from './+types/layout';
import { UserAvatar } from '@/components/user-avatar';
import { DetailShell, type EntityNav } from '@/features/milo';
import { authenticator } from '@/modules/auth';
import { userDetailQuery } from '@/resources/request/server';
import { ENTITY_ICONS, TAB_ICONS } from '@/utils/config/icons.config';
import { userRoutes } from '@/utils/config/routes.config';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ComMiloapisIamV1Alpha1User) => (
    <span>
      {data.spec?.givenName ?? ''} {data.spec?.familyName ?? ''}
    </span>
  ),
  // `handle` is module scope (no hooks, no `useLingui` macro — see
  // entity-scoped-left-nav.md's i18n gap, tracked as a follow-up), so these
  // labels are plain strings, same as `NAV_SECTIONS`.
  entityNav: (data: ComMiloapisIamV1Alpha1User, params: { userId?: string }): EntityNav => {
    const userId = params.userId ?? data.metadata?.name ?? '';
    const fullName = `${data.spec?.givenName ?? ''} ${data.spec?.familyName ?? ''}`.trim();

    return {
      backTo: { label: 'Users', href: userRoutes.list() },
      title: fullName || userId,
      icon: ENTITY_ICONS.user,
      groups: [
        {
          items: [
            { label: 'Overview', href: userRoutes.detail(userId), icon: TAB_ICONS.overview },
            {
              label: 'Organizations',
              href: userRoutes.organization(userId),
              icon: ENTITY_ICONS.organization,
            },
            { label: 'Contacts', href: userRoutes.contacts(userId), icon: ENTITY_ICONS.contact },
            {
              label: 'Email Activity',
              href: userRoutes.emailActivity(userId),
              icon: ENTITY_ICONS.emailActivity,
            },
            {
              label: 'Activity',
              icon: ENTITY_ICONS.activity,
              match: userRoutes.activity.root(userId),
              children: [
                { label: 'Feed', href: userRoutes.activity.root(userId) },
                { label: 'Audit Logs', href: userRoutes.activity.auditLogs(userId) },
              ],
            },
          ],
        },
      ],
    };
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await userDetailQuery(session?.accessToken ?? '', params?.userId ?? '');

  return data;
};

export default function Layout() {
  const data = useLoaderData<typeof loader>();

  const userId = data.metadata?.name ?? '';
  const fullName = `${data.spec?.givenName ?? ''} ${data.spec?.familyName ?? ''}`.trim();

  return (
    <DetailShell
      icon={
        <UserAvatar
          name={fullName || userId}
          avatarUrl={data.status?.avatarUrl}
          className="size-10"
        />
      }
      name={fullName || userId}
      subtitle={data.spec?.email}
    />
  );
}
