import type { Route } from './+types/layout';
import { DetailShell, type EntityTab } from '@/features/milo';
import { authenticator } from '@/modules/auth';
import { contactGroupDetailQuery } from '@/resources/request/server';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisNotificationV1Alpha1ContactGroup } from '@openapi/notification.miloapis.com/v1alpha1';
import { BookUser, InfoIcon, Users } from 'lucide-react';
import { useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ComMiloapisNotificationV1Alpha1ContactGroup) => {
    const displayName = data?.spec?.displayName || data?.metadata?.name;
    return <span>{displayName}</span>;
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
  const { t } = useLingui();
  const data = useLoaderData<typeof loader>();

  const name = data?.metadata?.name ?? '';
  const displayName = data?.spec?.displayName || name;

  const tabs: EntityTab[] = [
    {
      label: t`Details`,
      href: contactGroupRoutes.detail(name),
      icon: InfoIcon,
      end: true,
    },
    {
      label: t`Members`,
      href: contactGroupRoutes.member(name),
      icon: Users,
    },
  ];

  return (
    <DetailShell
      icon={
        <div className="bg-muted flex size-10 items-center justify-center rounded-md">
          <BookUser className="size-5" />
        </div>
      }
      name={displayName}
      tabs={tabs}
    />
  );
}
