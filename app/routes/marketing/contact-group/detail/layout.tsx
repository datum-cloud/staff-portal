import type { Route } from './+types/layout';
import { DetailShell, type EntityNav } from '@/features/milo';
import { authenticator } from '@/modules/auth';
import { contactGroupDetailQuery } from '@/resources/request/server';
import { ENTITY_ICONS, TAB_ICONS } from '@/utils/config/icons.config';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { ComMiloapisNotificationV1Alpha1ContactGroup } from '@openapi/notification.miloapis.com/v1alpha1';
import { useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ComMiloapisNotificationV1Alpha1ContactGroup) => {
    const displayName = data?.spec?.displayName || data?.metadata?.name;
    return <span>{displayName}</span>;
  },
  // `handle` is module scope (no hooks, no `useLingui` macro — see
  // entity-scoped-left-nav.md's i18n gap, tracked as a follow-up), so these
  // labels are plain strings, same as `NAV_SECTIONS`.
  entityNav: (
    data: ComMiloapisNotificationV1Alpha1ContactGroup,
    params: { contactGroupName?: string }
  ): EntityNav => {
    const name = params.contactGroupName ?? data?.metadata?.name ?? '';
    const displayName = data?.spec?.displayName || name;

    return {
      backTo: { label: 'Contact Groups', href: contactGroupRoutes.list() },
      title: displayName,
      icon: ENTITY_ICONS.contactGroup,
      groups: [
        {
          items: [
            {
              label: 'Details',
              href: contactGroupRoutes.detail(name),
              icon: TAB_ICONS.overview,
            },
            { label: 'Members', href: contactGroupRoutes.member(name), icon: ENTITY_ICONS.user },
          ],
        },
      ],
    };
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
  const data = useLoaderData<typeof loader>();

  const name = data?.metadata?.name ?? '';
  const displayName = data?.spec?.displayName || name;

  return (
    <DetailShell
      icon={
        <div className="bg-muted flex size-10 items-center justify-center rounded-md">
          <ENTITY_ICONS.contactGroup className="size-5" />
        </div>
      }
      name={displayName}
    />
  );
}
