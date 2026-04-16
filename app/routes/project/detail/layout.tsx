import type { Route } from './+types/layout';
import AppActionBar from '@/components/app-actiobar';
import {
  createClickableBreadcrumbItem,
  createStaticBreadcrumbItem,
  type BreadcrumbItem,
} from '@/components/breadcrumb';
import { SubLayout } from '@/components/sub-layout';
import { useEnv } from '@/hooks';
import { authenticator } from '@/modules/auth';
import { orgDetailQuery, projectDetailQuery } from '@/resources/request/server';
import { orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1Project,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import {
  ChartSpline,
  CircleGauge,
  ExternalLink,
  FileLock,
  FileText,
  Gauge,
  Layers,
  Signpost,
  SquareActivity,
} from 'lucide-react';
import { useMemo } from 'react';
import { Outlet, useLoaderData, useLocation, useParams } from 'react-router';

export const handle = {
  customBreadcrumb: {
    generateItems: (
      params: any,
      data: {
        project: ComMiloapisResourcemanagerV1Alpha1Project;
        organization: ComMiloapisResourcemanagerV1Alpha1Organization;
      }
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
          orgRoutes.detail(data?.organization?.metadata?.name ?? '')
        ),
        createClickableBreadcrumbItem(
          <Trans>Projects</Trans>,
          orgRoutes.project(data?.organization?.metadata?.name ?? '')
        ),
        createClickableBreadcrumbItem(
          projectName,
          projectRoutes.detail(data.project.metadata?.name ?? '')
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
  const env = useEnv();
  const { pathname } = useLocation();
  const params = useParams();

  const projectName = project?.metadata?.name ?? '';

  const cloudProjectUrl = useMemo(() => {
    if (!env?.CLOUD_PORTAL_URL || !projectName) return null;
    const base = `${env.CLOUD_PORTAL_URL}/project/${projectName}`;

    // Sub-resource detail pages (param present = on a specific resource detail)
    if (params.edgeName) return `${base}/edge/${params.edgeName}`;
    if (params.dnsName) return `${base}/dns-zones/${params.dnsName}`;
    if (params.domainName) return `${base}/domains/${params.domainName}`;
    if (params.exportPolicyName) return `${base}/export-policies/${params.exportPolicyName}`;

    // Sub-resource list pages
    if (pathname.startsWith(projectRoutes.edge.list(projectName))) return `${base}/edge`;
    if (pathname.startsWith(projectRoutes.dns.list(projectName))) return `${base}/dns-zones`;
    if (pathname.startsWith(projectRoutes.domain.list(projectName))) return `${base}/domains`;
    if (pathname.startsWith(projectRoutes.exportPolicy.list(projectName)))
      return `${base}/export-policies`;
    if (pathname.startsWith(projectRoutes.secret.list(projectName))) return `${base}/secrets`;
    if (pathname.startsWith(projectRoutes.activity.root(projectName))) return `${base}/activity`;
    if (
      pathname.startsWith(projectRoutes.quota.usage(projectName)) ||
      pathname.startsWith(projectRoutes.quota.grant(projectName))
    )
      return `${base}/quotas`;

    return base;
  }, [env, projectName, params, pathname]);

  const menuItems = [
    {
      title: t`Overview`,
      href: projectRoutes.detail(projectName),
      icon: FileText,
    },
    {
      title: t`AI Edge`,
      href: projectRoutes.edge.list(projectName),
      icon: Gauge,
    },
    {
      title: t`DNS`,
      href: projectRoutes.dns.list(projectName),
      icon: Signpost,
    },
    {
      title: t`Domains`,
      href: projectRoutes.domain.list(projectName),
      icon: Layers,
    },
    {
      title: t`Metrics`,
      href: projectRoutes.exportPolicy.list(projectName),
      icon: ChartSpline,
    },
    {
      title: t`Secrets`,
      href: projectRoutes.secret.list(projectName),
      icon: FileLock,
    },
    {
      title: t`Activity`,
      href: projectRoutes.activity.root(projectName),
      icon: SquareActivity,
    },
    {
      title: t`Quotas`,
      icon: CircleGauge,
      hasSubmenu: true,
      submenuItems: [
        {
          title: t`Usage`,
          href: `${projectRoutes.quota.usage(projectName)}`,
        },
        {
          title: t`Grants`,
          href: projectRoutes.quota.grant(projectName),
        },
      ],
    },
  ];

  return (
    <>
      {cloudProjectUrl && (
        <AppActionBar key={cloudProjectUrl}>
          <LinkButton
            href={cloudProjectUrl}
            target="_blank"
            rel="noopener noreferrer"
            type="secondary"
            theme="outline"
            size="small"
            icon={<ExternalLink size={12} />}
            iconPosition="right">
            <Trans>View in Cloud Portal</Trans>
          </LinkButton>
        </AppActionBar>
      )}
      <SubLayout>
        <SubLayout.SidebarLeft>
          <SubLayout.SidebarMenu menuItems={menuItems} />
        </SubLayout.SidebarLeft>
        <SubLayout.Content>
          <Outlet />
        </SubLayout.Content>
      </SubLayout>
    </>
  );
}
