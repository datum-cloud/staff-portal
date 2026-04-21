import { useClusterHealth } from '../hooks/use-cluster-health';
import type { ClusterEntry } from '../hooks/use-cluster-health';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Globe,
  HardDrive,
  MemoryStick,
  RefreshCw,
  ShieldAlert,
  XCircle,
  Zap,
} from 'lucide-react';

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-md" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <AlertCircle className="text-muted-foreground mb-3 h-8 w-8" />
      <Title level={5} className="mb-1">
        <Trans>Cluster metrics unavailable</Trans>
      </Title>
      <Text size="sm" textColor="muted" className="mb-3">
        <Trans>Could not query cluster health metrics</Trans>
      </Text>
      <Button type="secondary" size="small" onClick={onRetry}>
        <Trans>Retry</Trans>
      </Button>
    </div>
  );
}

function isClusterHealthy(c: ClusterEntry) {
  return (
    c.nodesReady &&
    c.gatewayHealthy !== false &&
    !c.memoryPressure &&
    !c.diskPressure &&
    !c.pidPressure
  );
}

function PressurePill({
  active,
  label,
  icon: Icon,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (!active) return null;
  return (
    <Tooltip message={`${label} pressure detected`} side="top">
      <span className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] leading-none font-medium">{label}</span>
      </span>
    </Tooltip>
  );
}

function MetricChip({
  icon: Icon,
  value,
  warn,
  tooltip,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  warn?: boolean;
  tooltip: string;
}) {
  const color = warn ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground';
  return (
    <Tooltip message={tooltip} side="top">
      <span className={`inline-flex items-center gap-0.5 ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="text-[10px] leading-none font-medium">{value}</span>
      </span>
    </Tooltip>
  );
}

function ClusterCell({ cluster }: { cluster: ClusterEntry }) {
  const healthy = isClusterHealthy(cluster);
  const hasCritical = !cluster.nodesReady || cluster.gatewayHealthy === false;
  const hasPressure = cluster.memoryPressure || cluster.diskPressure || cluster.pidPressure;
  const certWarn = cluster.certExpiryDays !== null && cluster.certExpiryDays < 14;

  const bg = healthy
    ? 'bg-green-50 dark:bg-green-950/20'
    : hasCritical
      ? 'bg-red-50 dark:bg-red-950/20'
      : 'bg-amber-50 dark:bg-amber-950/20';
  const cls = `flex min-w-0 gap-1.5 overflow-hidden rounded-md px-2 py-1.5 ${bg}`;

  return (
    <div className={cls}>
      <div className="pt-0.5">
        {healthy ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
        ) : hasCritical ? (
          <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{cluster.region ?? cluster.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {cluster.requestRate !== null && (
            <MetricChip
              icon={Zap}
              value={`${cluster.requestRate} rps`}
              tooltip="Envoy request rate (req/s)"
            />
          )}
          {cluster.certExpiryDays !== null && (
            <MetricChip
              icon={ShieldAlert}
              value={`${cluster.certExpiryDays}d`}
              warn={certWarn}
              tooltip={`Certificate expires in ${cluster.certExpiryDays} days`}
            />
          )}
          {cluster.restartingContainers > 0 && (
            <MetricChip
              icon={RefreshCw}
              value={`${cluster.restartingContainers}`}
              warn
              tooltip={`${cluster.restartingContainers} container(s) with >5 restarts`}
            />
          )}
        </div>
        {hasPressure && (
          <div className="mt-0.5 flex items-center gap-1.5">
            <PressurePill active={cluster.memoryPressure} label="MEM" icon={MemoryStick} />
            <PressurePill active={cluster.diskPressure} label="DISK" icon={HardDrive} />
            <PressurePill active={cluster.pidPressure} label="PID" icon={Cpu} />
          </div>
        )}
      </div>
    </div>
  );
}

export function ClusterHealthWidget() {
  const { data, isLoading, isError, refetch } = useClusterHealth();

  const summary = data?.summary;
  const allHealthy = summary && summary.healthy === summary.total && summary.total > 0;

  return (
    <Card className="gap-0 py-0">
      <CardContent className="px-4 py-3">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError || !summary || summary.total === 0 ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-2">
                <Globe className="text-muted-foreground h-4 w-4" />
                <Title level={5}>
                  <Trans>Cluster Health</Trans>
                </Title>
              </div>

              <div className="bg-border hidden h-5 w-px sm:block" />

              <div className="flex items-center gap-2">
                {allHealthy ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <Text size="sm" className="font-medium">
                  {summary.healthy}/{summary.total}{' '}
                  {summary.total === 1 ? (
                    <Trans>cluster healthy</Trans>
                  ) : (
                    <Trans>clusters healthy</Trans>
                  )}
                </Text>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {data?.clusters.map((cluster) => (
                <ClusterCell key={cluster.name} cluster={cluster} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
