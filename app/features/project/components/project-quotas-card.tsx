import { SectionCard } from '@/features/milo';
import { QuotaIndicator } from '@/features/organization/components/quota-ring';
import { listProjectQuotaBuckets, type GqlQuotaBucket } from '@/modules/graphql/quota';
import { projectRoutes } from '@/utils/config/routes.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { Gauge } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';

const LIST_MAX_HEIGHT = 'max-h-[9.5rem]';
const TOP_N = 4;

type Props = {
  projectName: string;
  className?: string;
};

function usagePercentage(bucket: GqlQuotaBucket): number {
  if (bucket.limit <= 0) return 0;
  return Math.round((bucket.allocated / bucket.limit) * 100);
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

export function ProjectQuotasCard({ projectName, className }: Props) {
  const query = useQuery({
    queryKey: ['projects', projectName, 'overview', 'quota-buckets'],
    queryFn: () => listProjectQuotaBuckets(projectName),
    enabled: Boolean(projectName),
    staleTime: 60 * 1000,
  });

  const topBuckets = useMemo(() => {
    const items = [...(query.data?.items ?? [])];
    items.sort((a, b) => {
      const pctDiff = usagePercentage(b) - usagePercentage(a);
      if (pctDiff !== 0) return pctDiff;
      return b.allocated - a.allocated;
    });
    return items.slice(0, TOP_N);
  }, [query.data?.items]);

  return (
    <SectionCard
      className={cn(className)}
      title={<Trans>Quotas</Trans>}
      description={<Trans>Highest utilization in this project</Trans>}
      action={
        <Link
          to={projectRoutes.quota.usage(projectName)}
          className="text-muted-foreground hover:text-foreground text-sm">
          <Trans>View all</Trans>
        </Link>
      }>
      {query.isPending ? (
        <LoadingRows />
      ) : query.isError ? (
        <EmptyMessage
          title={<Trans>Could not load quotas</Trans>}
          body={<Trans>Something went wrong while loading quota data.</Trans>}
        />
      ) : topBuckets.length === 0 ? (
        <EmptyMessage
          title={<Trans>No quotas</Trans>}
          body={<Trans>Quota buckets will appear here once resources are granted.</Trans>}
        />
      ) : (
        <ul className={cn(LIST_MAX_HEIGHT, 'divide-border -mx-1 divide-y overflow-y-auto px-1')}>
          {topBuckets.map((bucket) => (
            <li
              key={`${bucket.namespace}/${bucket.name}`}
              className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
              <QuotaIndicator used={bucket.allocated} limit={bucket.limit} />
              <div className="min-w-0 flex-1 overflow-hidden">
                <Tooltip message={bucket.displayName || bucket.resourceType}>
                  <span className="block truncate text-sm">
                    {bucket.displayName || bucket.resourceType}
                  </span>
                </Tooltip>
              </div>
              <Text size="sm" textColor="muted" className="shrink-0 whitespace-nowrap tabular-nums">
                {bucket.limit > 0
                  ? `${bucket.allocated} / ${bucket.limit}`
                  : String(bucket.allocated)}
              </Text>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function EmptyMessage({ title, body }: { title: ReactNode; body: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <Icon icon={Gauge} size={32} className="text-muted-foreground" />
      <Text size="sm" weight="medium">
        {title}
      </Text>
      <Text size="sm" textColor="muted" className="max-w-xs">
        {body}
      </Text>
    </div>
  );
}
