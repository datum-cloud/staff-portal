import type { Route } from './+types/layout';
import AppActionBar from '@/components/app-actiobar';
import { SubLayout } from '@/components/sub-layout';
import { useEnv } from '@/hooks';
import { authenticator } from '@/modules/auth';
import { orgDetailQuery } from '@/resources/request/server';
import { orgRoutes } from '@/utils/config/routes.config';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Trans, useLingui } from '@lingui/react/macro';
import { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import {
  BarChart3,
  CircleGauge,
  ExternalLink,
  FileText,
  Flag,
  Folders,
  Gauge,
  Layers,
  Signpost,
  SquareActivity,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { Outlet, useLoaderData, useLocation } from 'react-router';

export const handle = {
  breadcrumb: (data: ComMiloapisResourcemanagerV1Alpha1Organization) => {
    const displayName =
      data?.metadata?.annotations?.['kubernetes.io/display-name'] || data?.metadata?.name;
    return <span>{displayName}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await orgDetailQuery(session?.accessToken ?? '', params?.orgName ?? '');

  return data;
};

export default function Layout() {
  const { t } = useLingui();
  const data = useLoaderData<typeof loader>();
  const env = useEnv();
  const { pathname } = useLocation();

  const orgName = data?.metadata?.name ?? '';

  const cloudOrgUrl = useMemo(() => {
    if (!env?.CLOUD_PORTAL_URL || !orgName) return null;
    const base = `${env.CLOUD_PORTAL_URL}/org/${orgName}`;
    if (pathname.startsWith(orgRoutes.project(orgName))) return `${base}/projects`;
    if (pathname.startsWith(orgRoutes.member(orgName))) return `${base}/team`;
    if (pathname.startsWith(orgRoutes.activity.root(orgName))) return `${base}/activity`;
    if (
      pathname.startsWith(orgRoutes.quota.usage(orgName)) ||
      pathname.startsWith(orgRoutes.quota.grant(orgName))
    )
      return `${base}/quotas`;
    return base;
  }, [env, orgName, pathname]);

  const menuItems = [
    {
      title: t`Overview`,
      href: orgRoutes.detail(orgName),
      icon: FileText,
    },
    {
      title: t`Projects`,
      href: orgRoutes.project(orgName),
      icon: Folders,
    },
    {
      title: t`AI Edge`,
      href: orgRoutes.edge(orgName),
      icon: Gauge,
    },
    {
      title: t`DNS`,
      href: orgRoutes.dns(orgName),
      icon: Signpost,
    },
    {
      title: t`Domains`,
      href: orgRoutes.domain(orgName),
      icon: Layers,
    },
    {
      title: t`Activity`,
      icon: SquareActivity,
      hasSubmenu: true,
      submenuItems: [
        { title: t`Feed`, href: orgRoutes.activity.root(orgName) },
        { title: t`Events`, href: orgRoutes.activity.events(orgName) },
        { title: t`Audit Logs`, href: orgRoutes.activity.auditLogs(orgName) },
      ],
    },
    {
      title: t`Members`,
      href: orgRoutes.member(orgName),
      icon: Users,
    },
    {
      title: t`Usage`,
      href: orgRoutes.usage(orgName),
      icon: BarChart3,
    },
    {
      title: t`Quotas`,
      icon: CircleGauge,
      hasSubmenu: true,
      submenuItems: [
        {
          title: t`Usage`,
          href: `${orgRoutes.quota.usage(orgName)}`,
        },
        {
          title: t`Grants`,
          href: orgRoutes.quota.grant(orgName),
        },
      ],
    },
    {
      title: t`Feature Flags`,
      href: orgRoutes.featureFlags(orgName),
      icon: Flag,
    },
  ];

  return (
    <>
      {cloudOrgUrl && (
        <AppActionBar key={cloudOrgUrl}>
          <LinkButton
            href={cloudOrgUrl}
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
