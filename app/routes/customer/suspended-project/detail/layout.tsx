import type { Route } from './+types/layout';
import { DetailShell, type EntityTab } from '@/features/milo';
import { authenticator } from '@/modules/auth';
import { projectDetailQuery } from '@/resources/request/server';
import { ENTITY_ICONS, TAB_ICONS } from '@/utils/config/icons.config';
import { suspendedProjectRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisResourcemanagerV1Alpha1Project } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ComMiloapisResourcemanagerV1Alpha1Project) => {
    const displayName =
      data?.metadata?.annotations?.['kubernetes.io/description'] || data?.metadata?.name;
    return <span>{displayName}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await projectDetailQuery(session?.accessToken ?? '', params?.projectName ?? '');

  return data;
};

export default function Layout() {
  const { t } = useLingui();
  const data = useLoaderData<typeof loader>();

  const name = data?.metadata?.name ?? '';
  const displayName = data?.metadata?.annotations?.['kubernetes.io/description'] || name;

  const tabs: EntityTab[] = [
    {
      label: t`Overview`,
      href: suspendedProjectRoutes.detail(name),
      icon: TAB_ICONS.overview,
      end: true,
    },
    {
      label: t`Email Activity`,
      href: suspendedProjectRoutes.emailActivity(name),
      icon: ENTITY_ICONS.emailActivity,
    },
  ];

  return (
    <DetailShell
      icon={
        <div className="bg-muted flex size-10 items-center justify-center rounded-md">
          <ENTITY_ICONS.suspendedProject className="size-5" />
        </div>
      }
      name={displayName}
      subtitle={t`Suspended`}
      tabs={tabs}
    />
  );
}
