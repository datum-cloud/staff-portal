import {
  StatTile,
  StatTileDetail,
  StatTileHeadline,
  StatTileMessage,
  StatTileSkeleton,
} from '@/components/stat-tile';
import { useClusterHealth } from '@/features/dashboard/hooks/use-cluster-health';
import { useEmailDelivery } from '@/features/dashboard/hooks/use-platform-home';
import type { QuotaBucketRow } from '@/features/dashboard/hooks/use-quota-utilization-widget';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { emailActivityRoutes, orgRoutes } from '@/utils/config/routes.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { Link } from 'react-router';

function ClustersCard({ enabled }: { enabled: boolean }) {
  const { data, isLoading, isError } = useClusterHealth({ enabled });
  const summary = data?.summary;
  const unhealthy = data?.clusters.filter(
    (cl) =>
      !cl.nodesReady ||
      cl.gatewayHealthy === false ||
      cl.memoryPressure ||
      cl.diskPressure ||
      cl.pidPressure
  );

  return (
    <StatTile title={<Trans>Clusters</Trans>}>
      {!enabled ? (
        <StatTileMessage>
          <Trans>Cluster metrics aren&apos;t connected here.</Trans>
        </StatTileMessage>
      ) : isLoading ? (
        <StatTileSkeleton />
      ) : isError || !summary ? (
        <StatTileMessage>
          <Trans>Couldn&apos;t load cluster health.</Trans>
        </StatTileMessage>
      ) : (
        <>
          <StatTileHeadline
            icon={
              <Icon
                icon={summary.unhealthy === 0 ? STATUS_ICONS.success : STATUS_ICONS.error}
                size={18}
                className={summary.unhealthy === 0 ? 'text-success' : 'text-destructive'}
                aria-hidden
              />
            }>
            {summary.healthy}/{summary.total}
          </StatTileHeadline>
          <StatTileDetail>
            {summary.unhealthy === 0 ? (
              <Trans>All clusters healthy</Trans>
            ) : (
              <Trans>Unhealthy: {unhealthy?.map((cl) => cl.name).join(', ')}</Trans>
            )}
          </StatTileDetail>
        </>
      )}
    </StatTile>
  );
}

// Resource types look like `<api group>/<resource>[/<metric>]`; the group is
// noise here and a trailing generic metric ("count") says nothing on its own.
function quotaLabel(resourceType: string) {
  const parts = resourceType.split('/').filter((p) => !p.includes('.'));
  if (parts.length > 1 && parts[parts.length - 1] === 'count') parts.pop();
  return parts.join(' ') || resourceType;
}

function QuotaCard({ buckets, isLoading }: { buckets: QuotaBucketRow[]; isLoading: boolean }) {
  const top = buckets.slice(0, 3);

  return (
    <StatTile title={<Trans>Quota hot spots</Trans>} windowLabel={<Trans>≥ 70% used</Trans>}>
      {isLoading ? (
        <StatTileSkeleton />
      ) : top.length === 0 ? (
        <>
          <StatTileHeadline
            icon={
              <Icon icon={STATUS_ICONS.success} size={18} className="text-success" aria-hidden />
            }>
            0
          </StatTileHeadline>
          <StatTileDetail>
            <Trans>No organization is near a limit</Trans>
          </StatTileDetail>
        </>
      ) : (
        <ul className="flex flex-col">
          {top.map((b) => (
            <li key={`${b.orgName}:${b.resourceType}`}>
              <Link
                to={orgRoutes.quota.usage(b.orgName)}
                title={b.resourceType}
                className="hover:bg-accent -mx-1 flex h-7 items-center gap-2 rounded px-1 text-xs">
                <span className="min-w-0 flex-1 truncate">
                  {b.orgDisplayName}{' '}
                  <span className="text-muted-foreground">{quotaLabel(b.resourceType)}</span>
                </span>
                <span
                  className={cn(
                    'shrink-0 font-medium tabular-nums',
                    b.percentage >= 90 ? 'text-destructive' : 'text-warning'
                  )}>
                  {b.percentage}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </StatTile>
  );
}

function EmailCard() {
  const { data, isLoading, isError } = useEmailDelivery();
  const sent = data ? data.delivered + data.failed + data.pending : 0;
  const settled = data ? data.delivered + data.failed : 0;
  const rate = settled > 0 ? (data!.delivered / settled) * 100 : null;

  return (
    <StatTile
      title={<Trans>Email delivery</Trans>}
      windowLabel={<Trans>Last 24h</Trans>}
      href={emailActivityRoutes.list()}>
      {isLoading ? (
        <StatTileSkeleton />
      ) : isError || !data ? (
        <StatTileMessage>
          <Trans>Couldn&apos;t load email activity.</Trans>
        </StatTileMessage>
      ) : (
        <>
          <StatTileHeadline
            icon={
              data.failed > 0 ? (
                <Icon icon={STATUS_ICONS.warning} size={18} className="text-warning" aria-hidden />
              ) : undefined
            }>
            {rate == null ? '—' : `${rate.toFixed(1)}%`}
          </StatTileHeadline>
          <StatTileDetail>
            {sent === 0 ? (
              <Trans>No emails sent</Trans>
            ) : (
              <Trans>
                {sent.toLocaleString()} sent · {data.failed.toLocaleString()} failed
              </Trans>
            )}
            {data.truncated && '+'}
          </StatTileDetail>
        </>
      )}
    </StatTile>
  );
}

interface HealthSectionProps {
  clustersEnabled: boolean;
  quotaBuckets: QuotaBucketRow[];
  quotaLoading: boolean;
}

export function HealthSection({ clustersEnabled, quotaBuckets, quotaLoading }: HealthSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 px-1">
        <Text as="h2" size="sm" weight="medium">
          <Trans>Platform health</Trans>
        </Text>
        <Text size="xs" textColor="muted">
          <Trans>Infrastructure, quota pressure, and outbound email.</Trans>
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
        <ClustersCard enabled={clustersEnabled} />
        <QuotaCard buckets={quotaBuckets} isLoading={quotaLoading} />
        <EmailCard />
      </div>
    </section>
  );
}
