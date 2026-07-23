import { SectionCard } from '@/features/milo';
import { QuotaIndicator } from '@/features/organization/components/quota-ring';
import { formatUsagePair, ucumToMeterUnit } from '@/features/organization/lib/usage-format';
import type { MeterSeries } from '@/modules/billing/usage.types';
import { useOrgUsageDashboardQuery } from '@/resources/request/client/queries/usage.queries';
import { orgRoutes } from '@/utils/config/routes.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { BarChart3 } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';

const LIST_MAX_HEIGHT = 'max-h-[9.5rem]';
const TOP_N = 4;

type Props = {
  orgName: string;
  projectName: string;
  className?: string;
};

function sumSeries(values: { value: number }[]): number {
  return values.reduce((acc, point) => acc + point.value, 0);
}

function meterUsed(meter: MeterSeries): number {
  return meter.used ?? sumSeries(meter.values);
}

function meterLimit(meter: MeterSeries): number {
  return meter.limit ?? 0;
}

function usagePercentage(meter: MeterSeries): number {
  const limit = meterLimit(meter);
  if (limit <= 0) return 0;
  return Math.round((meterUsed(meter) / limit) * 100);
}

function LoadingRows() {
  return (
    <ul className={cn(LIST_MAX_HEIGHT, 'space-y-2 overflow-hidden')}>
      {Array.from({ length: TOP_N }).map((_, i) => (
        <li key={i} className="flex items-center gap-2 py-1.5">
          <Skeleton className="size-[18px] shrink-0 rounded-full" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-16" />
        </li>
      ))}
    </ul>
  );
}

export function ProjectUsageCard({ orgName, projectName, className }: Props) {
  const query = useOrgUsageDashboardQuery(orgName, projectName, 'current', {
    enabled: Boolean(orgName && projectName),
  });

  const usage = query.data?.usage;
  const cycleLabel =
    query.data?.billingCycles.find((c) => c.value === query.data?.selectedBillingCycle)?.label ??
    null;

  const meters = useMemo(() => {
    const items = [...(usage?.meters ?? [])];
    items.sort((a, b) => {
      const pctDiff = usagePercentage(b) - usagePercentage(a);
      if (pctDiff !== 0) return pctDiff;
      return meterUsed(b) - meterUsed(a);
    });
    return items.filter((m) => meterUsed(m) > 0 || meterLimit(m) > 0).slice(0, TOP_N);
  }, [usage?.meters]);

  const usageHref = `${orgRoutes.usage(orgName)}?project=${encodeURIComponent(projectName)}`;

  const description = cycleLabel ? (
    <Trans>Current billing cycle for this project</Trans>
  ) : (
    <Trans>Current billing cycle</Trans>
  );

  return (
    <SectionCard
      className={cn(className)}
      title={<Trans>Usage</Trans>}
      description={description}
      action={
        <Link to={usageHref} className="text-muted-foreground hover:text-foreground text-sm">
          <Trans>View all</Trans>
        </Link>
      }>
      {query.isPending ? (
        <LoadingRows />
      ) : query.isError ? (
        <EmptyMessage
          title={<Trans>Could not load usage</Trans>}
          body={<Trans>Something went wrong while loading usage data.</Trans>}
        />
      ) : usage?.status === 'unconfigured' ? (
        <EmptyMessage
          title={<Trans>Usage data not available</Trans>}
          body={<Trans>Usage metering is not configured for this environment.</Trans>}
        />
      ) : usage?.status === 'insufficient-permissions' ? (
        <EmptyMessage
          title={<Trans>Usage data not available</Trans>}
          body={
            <Trans>Billing permissions are still being provisioned for this organization.</Trans>
          }
        />
      ) : usage?.status === 'no-billing-account' ? (
        <EmptyMessage
          title={<Trans>No billing account</Trans>}
          body={<Trans>Assign a billing account to this project to track usage.</Trans>}
        />
      ) : meters.length === 0 ? (
        <EmptyMessage
          title={<Trans>No usage to display</Trans>}
          body={
            <Trans>
              Usage will appear here once this project starts consuming metered resources.
            </Trans>
          }
        />
      ) : (
        <ul className={cn(LIST_MAX_HEIGHT, 'divide-border -mx-1 divide-y overflow-y-auto px-1')}>
          {meters.map((meter) => {
            const unit = ucumToMeterUnit(meter.unit);
            const used = meterUsed(meter);
            const limit = meterLimit(meter);
            return (
              <li
                key={meter.meterApiName}
                className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
                <QuotaIndicator used={used} limit={limit} />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <Tooltip message={meter.label}>
                    <span className="block truncate text-sm">{meter.label}</span>
                  </Tooltip>
                </div>
                <Text
                  size="sm"
                  textColor="muted"
                  className="shrink-0 whitespace-nowrap tabular-nums">
                  {formatUsagePair(unit, used, limit)}
                </Text>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function EmptyMessage({ title, body }: { title: ReactNode; body: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <Icon icon={BarChart3} size={32} className="text-muted-foreground" />
      <Text size="sm" weight="medium">
        {title}
      </Text>
      <Text size="sm" textColor="muted" className="max-w-xs">
        {body}
      </Text>
    </div>
  );
}
