import type { Route } from './+types/layout';
import { BadgeState } from '@/components/badge';
import { PageHeader } from '@/components/page-header';
import { SubLayout } from '@/components/sub-layout';
import {
  useServiceConsumersInProjectQuery,
  useServiceDetailQuery,
} from '@/resources/request/client';
import { serviceCatalogRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { CheckSquare, FileText, Users } from 'lucide-react';
import { Link, Outlet, useParams } from 'react-router';

export const meta: Route.MetaFunction = ({ params }) => {
  return metaObject(params.name ?? t`Service Detail`);
};

function ServiceNameBreadcrumb() {
  const { name } = useParams<{ name: string }>();
  return <span>{name}</span>;
}

export const handle = {
  breadcrumb: () => <ServiceNameBreadcrumb />,
};

function PendingApprovalsBadge({
  producerProject,
  serviceName,
  canonicalName,
}: {
  producerProject: string | undefined;
  serviceName: string;
  canonicalName: string;
}) {
  const { data } = useServiceConsumersInProjectQuery(producerProject);
  const count = (data?.items ?? []).filter((c) => {
    const ref = c.spec?.serviceRef?.name;
    const matchesService = ref === serviceName || (!!canonicalName && ref === canonicalName);
    return matchesService && c.status?.phase === 'PendingApproval' && !c.spec?.approval;
  }).length;
  if (count === 0) return null;
  return (
    <span className="bg-primary/10 text-primary inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium">
      {count}
    </span>
  );
}

export default function ServiceDetailLayout() {
  const { name } = useParams<{ name: string }>();
  const serviceName = name ?? '';
  const { data: service, isLoading, error, refetch } = useServiceDetailQuery(serviceName);

  if (isLoading) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="py-8">
          <div className="animate-pulse space-y-3">
            <div className="bg-muted h-6 w-48 rounded" />
            <div className="bg-muted h-4 w-32 rounded" />
            <div className="bg-muted h-4 w-96 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !service) {
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Text size="sm" textColor="muted">
            {error ? <Trans>Failed to load service.</Trans> : <Trans>Service not found.</Trans>}
          </Text>
          {error && (
            <Text size="sm" textColor="muted" className="font-mono text-xs">
              {error instanceof Error ? error.message : String(error)}
            </Text>
          )}
          {error && (
            <button onClick={() => refetch()} className="text-primary text-sm hover:underline">
              <Trans>Retry</Trans>
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  const spec = service.spec;
  const displayName = spec?.displayName ?? serviceName;
  const canonicalName = spec?.serviceName ?? serviceName;
  const phase = spec?.phase ?? '';
  const ownerProject = spec?.owner?.producerProjectRef?.name;
  const description = spec?.description;
  const dependencies = spec?.dependencies ?? [];
  const isGated = spec?.enablementPolicy?.mode === 'GatedByProvider';

  const menuItems = [
    {
      title: t`Overview`,
      href: serviceCatalogRoutes.overview(serviceName),
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
        <div className="border-b px-4 pt-4 pb-4">
          <PageHeader
            className="mb-3"
            title={
              <div className="flex items-center gap-2">
                <span>{displayName}</span>
                <BadgeState state={phase} />
                {isGated && <BadgeState state="warning" message={t`Gated by Provider`} />}
              </div>
            }
            description={
              description ? (
                <Text size="sm" textColor="muted" className="max-w-2xl">
                  {description}
                </Text>
              ) : undefined
            }
          />

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Text size="xs" textColor="muted" className="font-mono">
              {canonicalName}
            </Text>
            {ownerProject && (
              <Text size="xs" textColor="muted">
                <Trans>Owner:</Trans> <span className="font-mono">{ownerProject}</span>
              </Text>
            )}
          </div>

          {dependencies.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Text size="sm" textColor="muted">
                <Trans>Dependencies:</Trans>
              </Text>
              {dependencies.map((dep) => (
                <Link
                  key={dep.serviceRef.name}
                  to={serviceCatalogRoutes.detail(dep.serviceRef.name)}
                  className="text-primary font-mono text-sm hover:underline">
                  {dep.serviceRef.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Outlet />
      </SubLayout.Content>
    </SubLayout>
  );
}
