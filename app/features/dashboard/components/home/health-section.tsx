import { useClusterHealth } from '@/features/dashboard/hooks/use-cluster-health';
import { useEmailDelivery } from '@/features/dashboard/hooks/use-platform-home';
import type { QuotaBucketRow } from '@/features/dashboard/hooks/use-quota-utilization-widget';
import { emailActivityRoutes, orgRoutes } from '@/utils/config/routes.config';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

function HealthCard({
  title,
  windowLabel,
  href,
  children,
}: {
  title: ReactNode;
  windowLabel?: ReactNode;
  href?: string;
  children: ReactNode;
}) {
  const card = (
    <Card size="sm" className={cn('h-full w-full', href && 'hover:bg-muted/30 transition-colors')}>
      <CardContent className="flex min-w-0 flex-col gap-2">
        <div className="flex h-4 items-center justify-between gap-2">
          <Text size="xs" weight="medium" textColor="muted">
            {title}
          </Text>
          {windowLabel && (
            <Text size="5xs" textColor="muted">
              {windowLabel}
            </Text>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );

  if (!href) return card;
  return (
    <Link
      to={href}
      className="focus-visible:ring-ring block h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none">
      {card}
    </Link>
  );
}

function CardSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-20 rounded" />
      <Skeleton className="h-4 w-32 rounded" />
    </>
  );
}

function Headline({ children }: { children: ReactNode }) {
  return (
    <Text
      as="div"
      size="2xl"
      weight="semibold"
      textColor="default"
      className="flex h-8 items-center gap-2 tabular-nums">
      {children}
    </Text>
  );
}

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
    <HealthCard title={<Trans>Clusters</Trans>}>
      {!enabled ? (
        <Text size="sm" textColor="muted" className="flex h-8 items-center">
          <Trans>Cluster metrics aren&apos;t connected here.</Trans>
        </Text>
      ) : isLoading ? (
        <CardSkeleton />
      ) : isError || !summary ? (
        <Text size="sm" textColor="muted" className="flex h-8 items-center">
          <Trans>Couldn&apos;t load cluster health.</Trans>
        </Text>
      ) : (
        <>
          <Headline>
            <Icon
              icon={summary.unhealthy === 0 ? CircleCheck : CircleX}
              size={18}
              className={summary.unhealthy === 0 ? 'text-green-600' : 'text-destructive'}
              aria-hidden
            />
            {summary.healthy}/{summary.total}
          </Headline>
          <Text size="xs" textColor="muted" ellipsis>
            {summary.unhealthy === 0 ? (
              <Trans>All clusters healthy</Trans>
            ) : (
              <Trans>Unhealthy: {unhealthy?.map((cl) => cl.name).join(', ')}</Trans>
            )}
          </Text>
        </>
      )}
    </HealthCard>
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
    <HealthCard title={<Trans>Quota hot spots</Trans>} windowLabel={<Trans>≥ 70% used</Trans>}>
      {isLoading ? (
        <CardSkeleton />
      ) : top.length === 0 ? (
        <>
          <Headline>
            <Icon icon={CircleCheck} size={18} className="text-green-600" aria-hidden />0
          </Headline>
          <Text size="xs" textColor="muted">
            <Trans>No organization is near a limit</Trans>
          </Text>
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
                    b.percentage >= 90 ? 'text-destructive' : 'text-amber-600'
                  )}>
                  {b.percentage}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HealthCard>
  );
}

function EmailCard() {
  const { data, isLoading, isError } = useEmailDelivery();
  const sent = data ? data.delivered + data.failed + data.pending : 0;
  const settled = data ? data.delivered + data.failed : 0;
  const rate = settled > 0 ? (data!.delivered / settled) * 100 : null;

  return (
    <HealthCard
      title={<Trans>Email delivery</Trans>}
      windowLabel={<Trans>Last 24h</Trans>}
      href={emailActivityRoutes.list()}>
      {isLoading ? (
        <CardSkeleton />
      ) : isError || !data ? (
        <Text size="sm" textColor="muted" className="flex h-8 items-center">
          <Trans>Couldn&apos;t load email activity.</Trans>
        </Text>
      ) : (
        <>
          <Headline>
            {data.failed > 0 && (
              <Icon icon={TriangleAlert} size={18} className="text-amber-500" aria-hidden />
            )}
            {rate == null ? '—' : `${rate.toFixed(1)}%`}
          </Headline>
          <Text size="xs" textColor="muted" className="tabular-nums">
            {sent === 0 ? (
              <Trans>No emails sent</Trans>
            ) : (
              <Trans>
                {sent.toLocaleString()} sent · {data.failed.toLocaleString()} failed
              </Trans>
            )}
            {data.truncated && '+'}
          </Text>
        </>
      )}
    </HealthCard>
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
