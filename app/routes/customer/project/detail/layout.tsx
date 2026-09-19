import type { Route } from './+types/layout';
import { BadgeState } from '@/components/badge';
import {
  createClickableBreadcrumbItem,
  createStaticBreadcrumbItem,
  type BreadcrumbItem,
} from '@/components/breadcrumb';
import { DetailShell, type EntityNav } from '@/features/milo';
import { isProjectDeleting } from '@/features/project/lib/project-phase';
import { useEnv } from '@/hooks';
import { authenticator } from '@/modules/auth';
import { useLiveProject } from '@/resources/request/client';
import { orgDetailQuery, projectDetailQuery } from '@/resources/request/server';
import { ACTION_ICONS, ENTITY_ICONS, TAB_ICONS } from '@/utils/config/icons.config';
import { orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1Project,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { useEffect, useMemo } from 'react';
import { useLoaderData, useLocation, useNavigate, useParams } from 'react-router';

type LoaderData = {
  project: ComMiloapisResourcemanagerV1Alpha1Project;
  organization: ComMiloapisResourcemanagerV1Alpha1Organization;
};

export const handle = {
  // `handle` is module scope (no hooks, no `useLingui` macro — see
  // entity-scoped-left-nav.md's i18n gap, tracked as a follow-up), so these
  // labels are plain strings, same as `NAV_SECTIONS`. The Compute tab is
  // gated on an installed workload plugin, a client hook — `useEntityNav`
  // injects it (see `withProjectCompute`), it can't live here.
  entityNav: (data: LoaderData, params: { projectName?: string }): EntityNav => {
    const projectName = params.projectName ?? data?.project?.metadata?.name ?? '';
    const displayName =
      data?.project?.metadata?.annotations?.['kubernetes.io/description'] || projectName;
    const orgName = data?.organization?.metadata?.name ?? '';
    const quotasBase = `${projectRoutes.detail(projectName)}/quotas`;

    return {
      // Matches the breadcrumb (Organizations -> org -> Projects): a project
      // is reached through its organization, so "back" is that org's own
      // project list, not the flat /customers/projects.
      backTo: { label: 'Projects', href: orgRoutes.project(orgName) },
      title: displayName,
      icon: ENTITY_ICONS.project,
      groups: [
        {
          items: [
            {
              label: 'Overview',
              href: projectRoutes.detail(projectName),
              icon: TAB_ICONS.overview,
            },
            { label: 'ALB', href: projectRoutes.edge.list(projectName), icon: ENTITY_ICONS.edge },
            { label: 'DNS', href: projectRoutes.dns.list(projectName), icon: ENTITY_ICONS.dns },
            {
              label: 'Domains',
              href: projectRoutes.domain.list(projectName),
              icon: ENTITY_ICONS.domain,
            },
            {
              label: 'Metrics',
              href: projectRoutes.exportPolicy.list(projectName),
              icon: TAB_ICONS.metrics,
            },
            {
              label: 'Secrets',
              href: projectRoutes.secret.list(projectName),
              icon: TAB_ICONS.secrets,
            },
            {
              label: 'Email Activity',
              href: projectRoutes.emailActivity(projectName),
              icon: ENTITY_ICONS.emailActivity,
            },
            {
              label: 'Activity',
              icon: ENTITY_ICONS.activity,
              match: projectRoutes.activity.root(projectName),
              children: [
                { label: 'Feed', href: projectRoutes.activity.root(projectName) },
                { label: 'Events', href: projectRoutes.activity.events(projectName) },
                { label: 'Audit Logs', href: projectRoutes.activity.auditLogs(projectName) },
              ],
            },
            {
              label: 'Quotas',
              icon: TAB_ICONS.quotas,
              match: quotasBase,
              children: [
                { label: 'Usage', href: projectRoutes.quota.usage(projectName) },
                { label: 'Grants', href: projectRoutes.quota.grant(projectName) },
              ],
            },
          ],
        },
      ],
    };
  },
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
  const loaderData = useLoaderData<typeof loader>();
  const { project, isGone } = useLiveProject(loaderData.project);
  const organization = loaderData.organization;
  const env = useEnv();
  const { pathname } = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  const projectName = project?.metadata?.name ?? loaderData.project?.metadata?.name ?? '';
  const displayName = project?.metadata?.annotations?.['kubernetes.io/description'] || projectName;
  const orgName = organization?.metadata?.name ?? '';
  const deleting = isProjectDeleting(project);

  useEffect(() => {
    if (!isGone || !orgName) return;
    toast.success(t`Project deleted`, {
      description: t`Cleanup finished and the project is no longer available.`,
    });
    navigate(orgRoutes.project(orgName));
  }, [isGone, orgName, navigate, t]);

  const cloudProjectUrl = useMemo(() => {
    if (!env?.CLOUD_PORTAL_URL || !projectName) return null;
    const base = `${env.CLOUD_PORTAL_URL}/project/${projectName}`;

    // Sub-resource detail pages (param present = on a specific resource detail)
    if (params.edgeName) return `${base}/alb/${params.edgeName}`;
    if (params.dnsName) return `${base}/dns-zones/${params.dnsName}`;
    if (params.domainName) return `${base}/domains/${params.domainName}`;
    if (params.exportPolicyName) return `${base}/export-policies/${params.exportPolicyName}`;

    // Sub-resource list pages
    if (pathname.startsWith(projectRoutes.edge.list(projectName))) return `${base}/alb`;
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

  return (
    <DetailShell
      icon={
        <div className="bg-muted flex size-10 items-center justify-center rounded-md">
          <ENTITY_ICONS.project className="size-5" />
        </div>
      }
      name={
        <span className="flex flex-wrap items-center gap-2">
          <span>{displayName}</span>
          {deleting && <BadgeState state="deleting" loading />}
        </span>
      }
      subtitle={projectName}
      actions={
        cloudProjectUrl && (
          <LinkButton
            href={cloudProjectUrl}
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
    />
  );
}
