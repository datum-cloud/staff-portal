import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/index';
import {
  MeterCard,
  toUsageView,
  UsageDashboardSkeleton,
  UsageSummaryTable,
  UsageToolbar,
  type UsageProjectOption,
} from '@/features/organization/usage';
import { useOrgProjectListQuery, useOrgUsageDashboardQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { BarChart3Icon } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Usage</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Usage - ${organizationName}`);
};

function resolveProjectSelection(
  projectParam: string | null,
  projects: UsageProjectOption[]
): string {
  if (!projectParam || projectParam === 'all') return 'all';
  return projects.some((project) => project.name === projectParam) ? projectParam : 'all';
}

function resolveCycleSelection(cycleParam: string | null): 'current' | 'previous' {
  return cycleParam === 'previous' ? 'previous' : 'current';
}

/**
 * Two-column section layout — title + copy on the left, content on the right.
 */
const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => {
  return (
    <section className="border-border grid min-w-0 grid-cols-1 gap-6 border-b py-8 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-foreground text-base font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
};

function EmptyState({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Icon icon={BarChart3Icon} className="text-muted-foreground size-10" />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
    </div>
  );
}

export default function OrgUsagePage() {
  const orgData = useOrganizationDetailData();
  const orgName = orgData.metadata?.name ?? '';
  const [searchParams] = useSearchParams();

  const projectsQuery = useOrgProjectListQuery(orgName);

  const projects: UsageProjectOption[] = useMemo(
    () =>
      (projectsQuery.data?.items ?? []).map((project) => ({
        name: project.name,
        displayName: project.displayName || project.name,
      })),
    [projectsQuery.data?.items]
  );

  const selectedProject = resolveProjectSelection(searchParams.get('project'), projects);
  const selectedBillingCycle = resolveCycleSelection(searchParams.get('cycle'));

  const {
    data: dashboard,
    isLoading,
    isFetching,
    isError,
    error,
  } = useOrgUsageDashboardQuery(orgName, selectedProject, selectedBillingCycle, {
    enabled: !!orgName,
  });

  const result = dashboard?.usage;
  const billingCycles = dashboard?.billingCycles ?? [];
  const isRefetching = isFetching && !isLoading;

  const selectedProjectLabel =
    selectedProject === 'all'
      ? null
      : (projects.find((project) => project.name === selectedProject)?.displayName ??
        selectedProject);

  const scopeDescription =
    selectedProjectLabel != null
      ? `Usage for the ${selectedProjectLabel} project in the selected billing period.`
      : 'Usage across all projects in this organization for the selected billing period.';

  const dashboardKey = `${selectedProject}-${selectedBillingCycle}`;
  const toolbarLoading = projectsQuery.isLoading || (isLoading && billingCycles.length === 0);

  if (isError) {
    return (
      <div className="m-4 flex min-w-0 flex-col gap-6">
        <EmptyState
          title="Usage data not available"
          body={error?.message ?? 'Something went wrong while loading usage data.'}
        />
      </div>
    );
  }

  if (isLoading && !result) {
    return (
      <div className="m-4 flex min-w-0 flex-col gap-6">
        <UsageToolbar
          projects={projects}
          billingCycles={billingCycles}
          isPlaceholder={toolbarLoading}
        />
        <UsageDashboardSkeleton scopeDescription={scopeDescription} />
      </div>
    );
  }

  if (!result) {
    return null;
  }

  if (result.status === 'unconfigured') {
    return (
      <div className="m-4 flex min-w-0 flex-col gap-6">
        <EmptyState
          title="Usage data not available"
          body={
            <>
              Configure{' '}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">AMBERFLO_API_KEY</code> on the
              staff-portal server to enable this dashboard.
            </>
          }
        />
      </div>
    );
  }

  if (result.status === 'insufficient-permissions') {
    return (
      <div className="m-4 flex min-w-0 flex-col gap-6">
        <EmptyState
          title="Usage data not available"
          body="Billing permissions are still being provisioned for this organization. Check back soon or contact the platform team if this persists."
        />
      </div>
    );
  }

  if (result.status === 'no-billing-account') {
    return (
      <div className="m-4 flex min-w-0 flex-col gap-6">
        <UsageToolbar projects={projects} billingCycles={billingCycles} isLoading={isRefetching} />
        <EmptyState
          title="No billing account linked"
          body={
            selectedProjectLabel
              ? `"${selectedProjectLabel}" does not have a billing account binding. Assign one from the organization's billing accounts to start tracking usage.`
              : `This organization does not have a billing account. Usage data is keyed to a billing account, so there is nothing to display.`
          }
        />
      </div>
    );
  }

  const view = toUsageView(result, projects);

  if (!view) {
    return (
      <div className="m-4 flex min-w-0 flex-col gap-6">
        <UsageToolbar projects={projects} billingCycles={billingCycles} isLoading={isRefetching} />
        <EmptyState
          title="No usage to display"
          body={
            selectedProjectLabel
              ? `Usage data will appear here once "${selectedProjectLabel}" starts consuming resources.`
              : 'Usage data will appear here once this organization starts consuming resources.'
          }
        />
      </div>
    );
  }

  return (
    <div className="m-4 flex min-w-0 flex-col gap-6">
      <UsageToolbar projects={projects} billingCycles={billingCycles} isLoading={isRefetching} />

      <div
        key={dashboardKey}
        className={cn(
          'border-border min-w-0 border-t',
          isRefetching && 'opacity-60 transition-opacity'
        )}>
        <Section
          title="Usage summary"
          description={`${scopeDescription} Your plan includes a set allowance for each metered service.`}>
          <UsageSummaryTable rows={view.summaryRows} />
        </Section>

        {view.groups.map((group) => (
          <Section key={group.id} title={group.title} description={scopeDescription}>
            {group.meters.length === 0 ? (
              <Card className="shadow-none">
                <CardContent className="text-muted-foreground py-12 text-center text-sm">
                  No meters defined yet for this group.
                </CardContent>
              </Card>
            ) : (
              group.meters.map((meter) => (
                <MeterCard key={`${dashboardKey}-${meter.apiName}`} meter={meter} />
              ))
            )}
          </Section>
        ))}
      </div>
    </div>
  );
}
