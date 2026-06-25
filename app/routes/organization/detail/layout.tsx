import type { Route } from './+types/layout';
import { EntityHeader, EntityTabNav, type EntityTab } from '@/features/milo';
import { useEnv } from '@/hooks';
import { authenticator } from '@/modules/auth';
import { useApp } from '@/providers/app.provider';
import { orgDetailQuery } from '@/resources/request/server';
import { orgRoutes } from '@/utils/config/routes.config';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Trans, useLingui } from '@lingui/react/macro';
import { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import {
  BarChart3,
  Building2,
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
  const { actions } = useApp();

  const orgName = data?.metadata?.name ?? '';
  const displayName = data?.metadata?.annotations?.['kubernetes.io/display-name'] || orgName;

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

  const quotasBase = `${orgRoutes.detail(orgName)}/quotas`;

  const tabs: EntityTab[] = [
    {
      label: t`Overview`,
      href: orgRoutes.detail(orgName),
      icon: <FileText className="size-4" />,
      end: true,
    },
    { label: t`Projects`, href: orgRoutes.project(orgName), icon: <Folders className="size-4" /> },
    { label: t`AI Edge`, href: orgRoutes.edge(orgName), icon: <Gauge className="size-4" /> },
    { label: t`DNS`, href: orgRoutes.dns(orgName), icon: <Signpost className="size-4" /> },
    { label: t`Domains`, href: orgRoutes.domain(orgName), icon: <Layers className="size-4" /> },
    { label: t`Members`, href: orgRoutes.member(orgName), icon: <Users className="size-4" /> },
    { label: t`Usage`, href: orgRoutes.usage(orgName), icon: <BarChart3 className="size-4" /> },
    {
      label: t`Activity`,
      icon: <SquareActivity className="size-4" />,
      match: orgRoutes.activity.root(orgName),
      children: [
        { label: t`Feed`, href: orgRoutes.activity.root(orgName) },
        { label: t`Events`, href: orgRoutes.activity.events(orgName) },
        { label: t`Audit Logs`, href: orgRoutes.activity.auditLogs(orgName) },
      ],
    },
    {
      label: t`Quotas`,
      icon: <CircleGauge className="size-4" />,
      match: quotasBase,
      children: [
        { label: t`Usage`, href: orgRoutes.quota.usage(orgName) },
        { label: t`Grants`, href: orgRoutes.quota.grant(orgName) },
      ],
    },
    {
      label: t`Feature Flags`,
      href: orgRoutes.featureFlags(orgName),
      icon: <Flag className="size-4" />,
    },
  ];

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4">
        <EntityHeader
          icon={
            <div className="bg-muted flex size-10 items-center justify-center rounded-md">
              <Building2 className="size-5" />
            </div>
          }
          name={displayName}
          subtitle={orgName}
          actions={
            <>
              {cloudOrgUrl && (
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
              )}
              {actions}
            </>
          }
        />
      </div>
      <EntityTabNav tabs={tabs} />
      <Outlet />
    </div>
  );
}
