import { aggregationQualifier, formatUsagePair, ucumToMeterUnit } from '../lib/usage-format';
import { QuotaIndicator } from './quota-ring';
import { SectionCard } from '@/features/milo';
import { SpendValue } from '@/features/organization/usage/components/spend-value';
import type { OrgUsageMeterSummary } from '@/modules/billing/org-usage.types';
import { useOrgUsageSummaryQuery } from '@/resources/request/client/queries/usage.queries';
import { orgRoutes } from '@/utils/config/routes.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { BarChart3 } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Meters listed on the card; the rest are on the usage page ("View all").
 * Kept short so the card stays level with the onboarding card beside it.
 */
const TOP_N = 4;

type Props = {
  orgName: string;
  className?: string;
};

function LoadingRows() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-6 w-48" />
      <ul>
        {Array.from({ length: TOP_N }).map((_, i) => (
          <li key={i} className="flex h-8 items-center gap-3">
            <Skeleton className="size-[18px] shrink-0 rounded-full" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-3.5 w-16" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Costliest first, then by usage, so the card leads with what matters. */
function byCost(a: OrgUsageMeterSummary, b: OrgUsageMeterSummary): number {
  return (b.spend?.amount ?? -1) - (a.spend?.amount ?? -1) || b.used - a.used;
}

export function OrgUsageCard({ orgName, className }: Props) {
  const query = useOrgUsageSummaryQuery(orgName);
  const summary = query.data;
  const meters = useMemo(() => [...(summary?.meters ?? [])].sort(byCost), [summary?.meters]);
  const shownMeters = meters.slice(0, TOP_N);
  const usageHref = orgRoutes.usage(orgName);

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
        <div className="flex flex-col gap-2">
          {summary.spend || summary.spendError ? (
            <div className="flex flex-wrap items-baseline gap-x-2">
              <Text size="xl" weight="semibold" textColor="default">
                <SpendValue spend={summary.spend} spendError={summary.spendError} />
              </Text>
              <Text size="xs" textColor="muted">
                <Trans>spend this period</Trans>
              </Text>
            </div>
          ) : null}
          {/* Fixed columns: names truncate instead of pushing the figures around. */}
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-7" />
              <col />
              <col className="w-28" />
              <col className="w-32" />
            </colgroup>
            <tbody className="divide-border divide-y">
              {shownMeters.map((meter) => {
                const unit = ucumToMeterUnit(meter.unit);
                const qualifier = aggregationQualifier(meter.aggregation);
                return (
                  <tr key={meter.meterDefinition} className="h-8">
                    <td className="align-middle">
                      <div className="flex items-center">
                        <QuotaIndicator used={meter.used} limit={meter.limit} />
                      </div>
                    </td>
                    <td className="overflow-hidden pr-3 align-middle">
                      <Tooltip message={meter.label}>
                        <Text size="sm" ellipsis className="block">
                          {meter.label}
                        </Text>
                      </Tooltip>
                    </td>
                    <td className="overflow-hidden pr-3 text-right align-middle whitespace-nowrap">
                      <Text size="sm" textColor="muted" className="tabular-nums">
                        {formatUsagePair(unit, meter.used, meter.limit)}
                        {qualifier ? (
                          <Text as="span" size="xs" textColor="muted" className="ml-1">
                            {qualifier}
                          </Text>
                        ) : null}
                      </Text>
                    </td>
                    <td className="overflow-hidden text-right align-middle whitespace-nowrap">
                      <Text size="sm" weight="medium" textColor="default">
                        <SpendValue spend={meter.spend} spendError={meter.spendError} />
                      </Text>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
