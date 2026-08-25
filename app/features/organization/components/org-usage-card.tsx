import { formatUsagePair, ucumToMeterUnit } from '../lib/usage-format';
import { QuotaIndicator } from './quota-ring';
import { SectionCard } from '@/features/milo';
import { formatCurrency } from '@/features/organization/usage/usage.format';
import { useOrgUsageSummaryQuery } from '@/resources/request/client/queries/usage.queries';
import { orgRoutes } from '@/utils/config/routes.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** ~4 compact rows before the list scrolls. */
const LIST_MAX_HEIGHT = 'max-h-[9.5rem]';

type Props = {
  orgName: string;
  className?: string;
};

function LoadingRows() {
  return (
    <ul className={cn(LIST_MAX_HEIGHT, 'space-y-2 overflow-hidden')}>
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-2 py-1.5">
          <Skeleton className="size-[18px] shrink-0 rounded-full" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-16" />
        </li>
      ))}
    </ul>
  );
}

export function OrgUsageCard({ orgName, className }: Props) {
  const query = useOrgUsageSummaryQuery(orgName);
  const summary = query.data;
  const meters = summary?.meters ?? [];

  const description =
    summary?.status === 'ok' ? (
      <Trans>Current billing cycle ({summary.cycleRangeLabel})</Trans>
    ) : (
      <Trans>Current billing cycle</Trans>
    );

  return (
    <SectionCard
      className={className}
      title={<Trans>Usage</Trans>}
      description={description}
      action={
        <Link
          to={orgRoutes.usage(orgName)}
          className="text-muted-foreground hover:text-foreground text-sm">
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
      ) : summary?.status === 'unconfigured' ? (
        <EmptyMessage
          title={<Trans>Usage data not available</Trans>}
          body={<Trans>Usage metering is not configured for this environment.</Trans>}
        />
      ) : summary?.status === 'insufficient-permissions' ? (
        <EmptyMessage
          title={<Trans>Usage data not available</Trans>}
          body={
            <Trans>Billing permissions are still being provisioned for this organization.</Trans>
          }
        />
      ) : summary?.status === 'no-billing-account' ? (
        <EmptyMessage
          title={<Trans>No billing account</Trans>}
          body={
            <Trans>
              This organization does not have a billing account. Usage and spend data require a
              linked billing account.
            </Trans>
          }
        />
      ) : summary?.status !== 'ok' || meters.length === 0 ? (
        <EmptyMessage
          title={<Trans>No usage to display</Trans>}
          body={
            <Trans>
              Usage will appear here once this organization starts consuming metered resources.
            </Trans>
          }
        />
      ) : (
        <>
          {summary.totalSpend !== undefined ? (
            <div className="border-border mb-3 flex items-baseline justify-between gap-3 border-b pb-3">
              <Text size="sm" textColor="muted">
                <Trans>Total spend</Trans>
              </Text>
              <Text size="sm" weight="medium" className="tabular-nums">
                {formatCurrency(summary.totalSpend, summary.currencyCode)}
              </Text>
            </div>
          ) : null}
          <ul className={cn(LIST_MAX_HEIGHT, 'divide-border -mx-1 divide-y overflow-y-auto px-1')}>
            {meters.map((meter) => {
              const unit = ucumToMeterUnit(meter.unit);
              return (
                <li
                  key={meter.meterApiName}
                  className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
                  <QuotaIndicator used={meter.used} limit={meter.limit} />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <Tooltip message={meter.label}>
                      <span className="block truncate text-sm">{meter.label}</span>
                    </Tooltip>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <Text size="sm" textColor="muted" className="whitespace-nowrap tabular-nums">
                      {formatUsagePair(unit, meter.used, meter.limit)}
                    </Text>
                    {meter.spend !== undefined ? (
                      <Text size="xs" className="text-foreground whitespace-nowrap tabular-nums">
                        {formatCurrency(meter.spend, summary.currencyCode)}
                      </Text>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
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
