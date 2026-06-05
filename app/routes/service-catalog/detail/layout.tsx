import type { Route } from './+types/layout';
import { SubLayout } from '@/components/sub-layout';
import { PendingApprovalsBadge } from '@/features/service-catalog';
import { authenticator } from '@/modules/auth';
import { serviceDetailQuery } from '@/resources/request/server';
import { serviceCatalogRoutes } from '@/utils/config/routes.config';
import { useLingui } from '@lingui/react/macro';
import { ComMiloapisServicesV1Alpha1Service } from '@openapi/services.miloapis.com/v1alpha1';
import { CheckSquare, FileText, Users } from 'lucide-react';
import { Outlet, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: ComMiloapisServicesV1Alpha1Service) => {
    const displayName = data?.spec?.displayName || data?.metadata?.name;
    return <span>{displayName}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await serviceDetailQuery(session?.accessToken ?? '', params?.name ?? '');
  return data;
};

export default function ServiceDetailLayout() {
  const { t } = useLingui();
  const service = useLoaderData<typeof loader>();

  const serviceName = service.metadata?.name ?? '';
  const canonicalName = service.spec?.serviceName ?? serviceName;
  const ownerProject = service.spec?.owner?.producerProjectRef?.name;
  const isGated = service.spec?.enablementPolicy?.mode === 'GatedByProvider';

  const menuItems = [
    {
      title: t`Overview`,
      href: serviceCatalogRoutes.detail(serviceName),
      icon: FileText,
    },
    {
      title: t`Consumers`,
      href: serviceCatalogRoutes.consumers(serviceName),
      icon: Users,
    },
    ...(isGated
      ? [
          {
            title: t`Approvals`,
            href: serviceCatalogRoutes.approvals(serviceName),
            icon: CheckSquare,
            badge: (
              <PendingApprovalsBadge
                producerProject={ownerProject}
                serviceName={serviceName}
                canonicalName={canonicalName}
              />
            ),
          },
        ]
      : []),
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
