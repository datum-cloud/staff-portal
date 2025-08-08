import type { Route } from './+types/layout';
import {
  createClickableBreadcrumbItem,
  createStaticBreadcrumbItem,
  type BreadcrumbItem,
} from '@/components/breadcrumb';
import { SubLayout } from '@/components/sub-layout';
import { authenticator } from '@/modules/auth';
import { orgDetailQuery, projectDetailQuery } from '@/resources/request/server';
import { Organization, Project } from '@/resources/schemas';
import { orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChartArea, FileText, SquareActivity, Waypoints } from 'lucide-react';
import { Outlet, useLoaderData } from 'react-router';

export const handle = {
  customBreadcrumb: {
    generateItems: (
      params: any,
      data: { project: Project; organization: Organization }
    ): BreadcrumbItem[] => {
      const organizationName =
        data?.organization?.metadata?.annotations?.['kubernetes.io/display-name'] ||
        data?.organization?.metadata?.name;
      const projectName =
        data?.project?.metadata?.annotations?.['kubernetes.io/description'] ||
        data?.project?.metadata?.name;

      return [
        createStaticBreadcrumbItem(<Trans>Customers</Trans>),
        createClickableBreadcrumbItem(<Trans>Organizations</Trans>, orgRoutes.list()),
        createClickableBreadcrumbItem(
          organizationName,
          orgRoutes.detail(data?.organization?.metadata?.name)
        ),
        createClickableBreadcrumbItem(
          <Trans>Projects</Trans>,
          orgRoutes.project(data?.organization?.metadata?.name)
        ),
        createClickableBreadcrumbItem(
          projectName,
          projectRoutes.detail(data.project.metadata.name)
        ),
      ];
    },
    replace: -2,
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const project = await projectDetailQuery(session?.accessToken ?? '', params?.projectName ?? '');
  const organization = await orgDetailQuery(
    session?.accessToken ?? '',
    project?.spec?.ownerRef?.name ?? ''
  );

  return { project, organization };
};

export default function Layout() {
  const { t } = useLingui();
  const { project } = useLoaderData<typeof loader>();

  const menuItems = [
    {
      title: t`Overview`,
      href: projectRoutes.detail(project.metadata.name),
      icon: FileText,
    },
    {
      title: t`HTTP Proxies`,
      href: projectRoutes.httpProxy.list(project.metadata.name),
      icon: Waypoints,
    },
    {
      title: t`Export Policies`,
      href: projectRoutes.exportPolicy.list(project.metadata.name),
      icon: ChartArea,
    },
    {
      title: t`Activity`,
      href: projectRoutes.activity(project.metadata.name),
      icon: SquareActivity,
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
