import type { Route } from './+types/layout';
import { DetailShell, type EntityNav } from '@/features/milo';
import { authenticator } from '@/modules/auth';
import { groupDetailQuery } from '@/resources/request/server';
import { ENTITY_ICONS, TAB_ICONS } from '@/utils/config/icons.config';
import { groupRoutes } from '@/utils/config/routes.config';
import { ComMiloapisIamV1Alpha1Group } from '@openapi/iam.miloapis.com/v1alpha1';
import { useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ComMiloapisIamV1Alpha1Group) => {
    const displayName =
      data?.metadata?.annotations?.['kubernetes.io/display-name'] || data?.metadata?.name;
    return <span>{displayName}</span>;
  },
  // `handle` is module scope (no hooks, no `useLingui` macro — see
  // entity-scoped-left-nav.md's i18n gap, tracked as a follow-up), so these
  // labels are plain strings, same as `NAV_SECTIONS`.
  entityNav: (data: ComMiloapisIamV1Alpha1Group, params: { groupName?: string }): EntityNav => {
    const name = params.groupName ?? data?.metadata?.name ?? '';
    const displayName = data?.metadata?.annotations?.['kubernetes.io/display-name'] || name;

    return {
      backTo: { label: 'Groups', href: groupRoutes.list() },
      title: displayName,
      icon: ENTITY_ICONS.group,
      groups: [
        {
          items: [
            { label: 'Overview', href: groupRoutes.detail(name), icon: TAB_ICONS.overview },
            { label: 'Members', href: groupRoutes.member(name), icon: ENTITY_ICONS.user },
          ],
        },
      ],
    };
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await groupDetailQuery(session?.accessToken ?? '', params?.groupName ?? '');

  return data;
};

export default function Layout() {
  const data = useLoaderData<typeof loader>();

  const name = data?.metadata?.name ?? '';
  const displayName = data?.metadata?.annotations?.['kubernetes.io/display-name'] || name;

  return (
    <DetailShell
      icon={
        <div className="bg-muted flex size-10 items-center justify-center rounded-md">
          <ENTITY_ICONS.group className="size-5" />
        </div>
      }
      name={displayName}
    />
  );
}
