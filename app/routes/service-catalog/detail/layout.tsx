import type { Route } from './+types/layout';
import { BadgeState } from '@/components/badge';
import { PageHeader } from '@/components/page-header';
import {
  useServiceConsumersInProjectQuery,
  useServiceDetailQuery,
} from '@/resources/request/client';
import { serviceCatalogRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ArrowLeft } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router';

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

function useActiveTab(name: string) {
  const { pathname } = useLocation();
  if (pathname.startsWith(serviceCatalogRoutes.approvals(name))) return 'approvals';
  if (pathname.startsWith(serviceCatalogRoutes.consumers(name))) return 'consumers';
  return 'overview';
}

function SideNavItem({
  to,
  active,
  children,
  badge,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={false}
      className={cn(
        'flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors',
        active
          ? 'bg-muted text-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      )}>
      <span>{children}</span>
      {badge}
    </NavLink>
  );
}

function PendingApprovalsCount({
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
  const activeTab = useActiveTab(serviceName);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Card className="m-4 shadow-none">
          <CardContent className="py-8">
            <div className="animate-pulse space-y-3">
              <div className="bg-muted h-6 w-48 rounded" />
              <div className="bg-muted h-4 w-32 rounded" />
              <div className="bg-muted h-4 w-96 rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
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
      </div>
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

  const tabs = [
    {
      label: t`Overview`,
      value: 'overview',
      to: serviceCatalogRoutes.overview(serviceName),
    },
    {
      label: t`Consumers`,
      value: 'consumers',
      to: serviceCatalogRoutes.consumers(serviceName),
    },
    ...(isGated
      ? [
          {
            label: t`Approvals`,
            value: 'approvals',
            to: serviceCatalogRoutes.approvals(serviceName),
            badge: (
              <PendingApprovalsCount
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
    <div className="flex flex-1 overflow-hidden">
      <aside className="bg-muted/20 flex w-56 shrink-0 flex-col gap-3 overflow-y-auto border-r px-3 py-4">
        <Link
          to={serviceCatalogRoutes.list()}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 text-xs">
          <ArrowLeft className="h-3 w-3" />
          <Trans>Services</Trans>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {tabs.map((tab) => (
            <SideNavItem
              key={tab.value}
              to={tab.to}
              active={activeTab === tab.value}
              badge={'badge' in tab ? tab.badge : undefined}>
              {tab.label}
            </SideNavItem>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
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

        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
