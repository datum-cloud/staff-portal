import type { Route } from './+types/layout';
import { DetailShell, type EntityTab } from '@/features/milo';
import { authenticator } from '@/modules/auth';
import { groupDetailQuery } from '@/resources/request/server';
import { ENTITY_ICONS, TAB_ICONS } from '@/utils/config/icons.config';
import { groupRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1Group } from '@openapi/iam.miloapis.com/v1alpha1';
import { useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ComMiloapisIamV1Alpha1Group) => {
    const displayName =
      data?.metadata?.annotations?.['kubernetes.io/display-name'] || data?.metadata?.name;
    return <span>{displayName}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await groupDetailQuery(session?.accessToken ?? '', params?.groupName ?? '');

  return data;
};

export default function Layout() {
  const { t } = useLingui();
  const data = useLoaderData<typeof loader>();

  const name = data?.metadata?.name ?? '';
  const displayName = data?.metadata?.annotations?.['kubernetes.io/display-name'] || name;

  const tabs: EntityTab[] = [
    {
      label: t`Overview`,
      href: groupRoutes.detail(name),
      icon: TAB_ICONS.overview,
      end: true,
    },
    {
      label: t`Members`,
      href: groupRoutes.member(name),
      icon: ENTITY_ICONS.user,
    },
  ];

  return (
    <DetailShell
      icon={
        <div className="bg-muted flex size-10 items-center justify-center rounded-md">
          <ENTITY_ICONS.group className="size-5" />
        </div>
      }
      name={displayName}
      tabs={tabs}
    />
  );
}
