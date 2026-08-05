import type { Route } from './+types/layout';
import { CustomerStatus } from '@/components/badge';
import { DetailShell, type EntityTab } from '@/features/milo';
import { useEnv } from '@/hooks';
import { authenticator } from '@/modules/auth';
import { useOrganizationQuery } from '@/resources/request/client';
import { orgDetailQuery } from '@/resources/request/server';
import { ACTION_ICONS, ENTITY_ICONS, TAB_ICONS } from '@/utils/config/icons.config';
import { orgRoutes } from '@/utils/config/routes.config';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Trans, useLingui } from '@lingui/react/macro';
import { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { useMemo } from 'react';
import { useLoaderData, useLocation } from 'react-router';

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
  const k8sDisplayName = data?.metadata?.annotations?.['kubernetes.io/display-name'] || orgName;

  const { data: gqlOrg } = useOrganizationQuery(orgName);
  const companyName = gqlOrg?.contactInfo?.businessName?.trim() || null;
  const gqlDisplayName = gqlOrg?.displayName?.trim() || null;
  const headerTitle = companyName || gqlDisplayName || k8sDisplayName;
  const headerSubtitle = companyName
    ? [gqlDisplayName && gqlDisplayName !== companyName ? gqlDisplayName : null, orgName]
        .filter(Boolean)
        .join(' · ')
    : orgName;

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
      icon: TAB_ICONS.overview,
      end: true,
    },
    { label: t`Projects`, href: orgRoutes.project(orgName), icon: ENTITY_ICONS.project },
    {
      label: t`Resources`,
      icon: ENTITY_ICONS.resource,
      match: [orgRoutes.edge(orgName), orgRoutes.dns(orgName), orgRoutes.domain(orgName)],
      children: [
        { label: t`ALB`, href: orgRoutes.edge(orgName) },
        { label: t`DNS`, href: orgRoutes.dns(orgName) },
        { label: t`Domains`, href: orgRoutes.domain(orgName) },
      ],
    },
    { label: t`Members`, href: orgRoutes.member(orgName), icon: ENTITY_ICONS.user },
    { label: t`Usage`, href: orgRoutes.usage(orgName), icon: TAB_ICONS.usage },
    {
      label: t`Activity`,
      icon: ENTITY_ICONS.activity,
      match: orgRoutes.activity.root(orgName),
      children: [
        { label: t`Feed`, href: orgRoutes.activity.root(orgName) },
        { label: t`Events`, href: orgRoutes.activity.events(orgName) },
        { label: t`Audit Logs`, href: orgRoutes.activity.auditLogs(orgName) },
      ],
    },
    {
      label: t`Quotas`,
      icon: TAB_ICONS.quotas,
      match: quotasBase,
      children: [
        { label: t`Usage`, href: orgRoutes.quota.usage(orgName) },
        { label: t`Grants`, href: orgRoutes.quota.grant(orgName) },
      ],
    },
    {
      label: t`Feature Flags`,
      href: orgRoutes.featureFlags(orgName),
      icon: TAB_ICONS.featureFlags,
    },
  ];

  return (
    <DetailShell
      icon={
        <div className="bg-muted flex size-10 items-center justify-center rounded-md">
          <ENTITY_ICONS.organization className="size-5" />
        </div>
      }
      name={
        <span className="flex flex-wrap items-center gap-2">
          <span>{headerTitle}</span>
          {gqlOrg && (
            <CustomerStatus
              status={gqlOrg.onboardingStatus}
              tooltip={
                gqlOrg.onboardingComplete
                  ? t`Fully onboarded`
                  : (gqlOrg.onboardingMessage ??
                    gqlOrg.onboardingReason ??
                    t`Onboarding incomplete`)
              }
            />
          )}
        </span>
      }
      subtitle={headerSubtitle}
      actions={
        cloudOrgUrl && (
          <LinkButton
            href={cloudOrgUrl}
            target="_blank"
            rel="noopener noreferrer"
            type="secondary"
            theme="outline"
            size="small"
            icon={<ACTION_ICONS.externalLink size={12} />}
            iconPosition="right">
            <Trans>View in Cloud Portal</Trans>
          </LinkButton>
        )
      }
      tabs={tabs}
    />
  );
}
