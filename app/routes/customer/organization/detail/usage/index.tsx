import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/index';
import {
  IdleMeterList,
  MeterCard,
  toUsageView,
  UsageDashboardSkeleton,
  UsageSummaryTable,
  UsageToolbar,
  type UsageBillingCycleOption,
  type UsageProjectOption,
} from '@/features/organization/usage';
import { SpendValue } from '@/features/organization/usage/components/spend-value';
import type { UsageSpend } from '@/modules/billing/usage.types';
import { useOrgProjectListQuery, useOrgUsageDashboardQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
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
        <Title as="h2" level={6} weight="medium" textColor="default">
          {title}
        </Title>
        <Text as="p" textColor="muted" className="leading-relaxed">
          {description}
        </Text>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
};

function EmptyState({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Icon icon={BarChart3Icon} className="text-muted-foreground size-10" />
      <Text as="p" size="lg" weight="medium">
        {title}
      </Text>
      <Text as="p" textColor="muted" className="max-w-sm">
        {body}
      </Text>
    </div>
  );
}

function UsagePageHeader({
  projects,
  billingCycles,
  isLoading,
  isPlaceholder,
  spend,
  spendError,
}: {
  projects: UsageProjectOption[];
  billingCycles: UsageBillingCycleOption[];
  isLoading?: boolean;
  isPlaceholder?: boolean;
  spend?: UsageSpend;
  spendError?: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <UsageToolbar
          projects={projects}
          billingCycles={billingCycles}
          isLoading={isLoading}
          isPlaceholder={isPlaceholder}
        />
      </div>
      {spend || spendError ? (
        <div className="shrink-0 text-left lg:text-right">
          <Text as="p" size="xs" textColor="muted">
            Spend this period
          </Text>
          <Text as="p" size="xl" weight="semibold" textColor="default" className="sm:text-2xl">
            <SpendValue spend={spend} spendError={spendError} />
          </Text>
        </div>
      ) : null}
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
      ? `Metered consumption and spend for the ${selectedProjectLabel} project in the selected billing period.`
      : 'Metered consumption and spend across all projects in this organization for the selected billing period.';

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
        <UsagePageHeader
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
        <UsagePageHeader
          projects={projects}
          billingCycles={billingCycles}
          isLoading={isRefetching}
        />
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
        <UsagePageHeader
          projects={projects}
          billingCycles={billingCycles}
          isLoading={isRefetching}
          spend={result.spend}
          spendError={result.spendError}
        />
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

  // Services with any usage get cards; fully idle ones collapse into one
  // list at the bottom so the page leads with what was actually used.
  const activeGroups = view.groups.filter((group) => group.meters.length > 0);
  const idleGroups = view.groups.filter((group) => group.meters.length === 0);

  return (
    <div className="m-4 flex min-w-0 flex-col gap-6">
      <UsagePageHeader
        projects={projects}
        billingCycles={billingCycles}
        isLoading={isRefetching}
        spend={view.spend}
        spendError={view.spendError}
      />

      <div
        key={dashboardKey}
        className={cn(
          'border-border min-w-0 border-t',
          isRefetching && 'opacity-60 transition-opacity'
        )}>
        <Section title="Usage summary" description={scopeDescription}>
          <UsageSummaryTable rows={view.summaryRows} />
        </Section>

        {activeGroups.map((group) => (
          <Section key={group.id} title={group.title} description={scopeDescription}>
            {group.meters.map((meter) => (
              <MeterCard key={`${dashboardKey}-${meter.id}`} meter={meter} />
            ))}
            {group.idleMeters.length > 0 ? (
              <IdleMeterList groups={[{ id: group.id, meters: group.idleMeters }]} />
            ) : null}
          </Section>
        ))}

        {idleGroups.length > 0 ? (
          <Section
            title="No usage this period"
            description="These services have meters but recorded nothing in the selected billing period.">
            <IdleMeterList
              groups={idleGroups.map((group) => ({
                id: group.id,
                title: group.title,
                meters: group.idleMeters,
              }))}
            />
          </Section>
        ) : null}
      </div>
    </div>
  );
}
