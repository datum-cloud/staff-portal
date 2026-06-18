import { getProjectDetailMetadata } from '../../../shared';
import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { ButtonCopy } from '@/components/button';
import { DateTime } from '@/components/date';
import { PageHeader } from '@/components/page-header';
import { authenticator } from '@/modules/auth';
import { toInstanceList, instanceStatusToBadgeStatus } from '@/resources/instances';
import { projectWorkloadDetailQuery, projectInstanceListQuery } from '@/resources/request/server';
import { useProjectQuotaBucketListQuery } from '@/resources/request/client';
import { toWorkload, workloadHealthToBadgeStatus, type Workload } from '@/resources/workloads';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { CodeEditor, type EditorLanguage } from '@datum-cloud/datum-ui/code-editor';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { dump } from 'js-yaml';
import { CopyIcon, HeartPulseIcon, MapPinIcon, ServerIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useLoaderData, useParams } from 'react-router';

export const handle = {
  breadcrumb: (data: { workload: Workload }) => (
    <span>{data?.workload?.name ?? 'Workload'}</span>
  ),
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Workload - ${projectName}`);
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const [raw, instancesRaw] = await Promise.all([
    projectWorkloadDetailQuery(
      session?.accessToken ?? '',
      params.projectName ?? '',
      params.workloadName ?? ''
    ),
    projectInstanceListQuery(
      session?.accessToken ?? '',
      params.projectName ?? '',
      params.workloadName ?? ''
    ),
  ]);
  const workload = toWorkload(raw as any);
  const instances = toInstanceList((instancesRaw as any)?.items ?? []).items;
  return { raw, workload, instances };
};

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card className="rounded-xl py-0 shadow-none">
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn('mt-0.5 shrink-0', highlight ? 'text-success' : 'text-muted-foreground')}>
          {icon}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </span>
          <span className={cn('font-semibold', highlight ? 'text-success' : 'text-foreground')}>
            {value}
          </span>
          {sub && <span className="text-muted-foreground text-xs">{sub}</span>}
        </div>
      </div>
    </Card>
  );
}

function conditionStatusToBadgeState(status: 'True' | 'False' | 'Unknown'): string {
  switch (status) {
    case 'True':
      return 'active';
    case 'False':
      return 'error';
    default:
      return 'unknown';
  }
}

export default function WorkloadDetailPage() {
  const { raw, workload, instances } = useLoaderData<typeof loader>();
  const { projectName = '', workloadName = '' } = useParams();

  const { data: quotaBuckets } = useProjectQuotaBucketListQuery(projectName);

  const computeQuota = useMemo(() => {
    const items = quotaBuckets?.items ?? [];
    const COMPUTE_TYPES = [
      'compute.datumapis.com/instances',
      'compute.datumapis.com/vcpus',
      'compute.datumapis.com/memory',
    ] as const;
    return COMPUTE_TYPES.map((resourceType) => {
      const bucket = items.find((b) => b.spec?.resourceType === resourceType);
      const allocated = bucket?.status?.allocated ?? 0;
      const limit = bucket?.status?.limit ?? 0;
      const pct = limit > 0 ? Math.round((allocated / limit) * 100) : 0;

      let label: string;
      let used: string;
      let total: string;
      if (resourceType === 'compute.datumapis.com/vcpus') {
        label = 'vCPUs';
        used = (allocated / 1000).toFixed(1).replace(/\.0$/, '');
        total = (limit / 1000).toFixed(1).replace(/\.0$/, '');
      } else if (resourceType === 'compute.datumapis.com/memory') {
        label = 'Memory';
        used = allocated >= 1024 ? `${(allocated / 1024).toFixed(1).replace(/\.0$/, '')} GiB` : `${allocated} MiB`;
        total = limit >= 1024 ? `${(limit / 1024).toFixed(1).replace(/\.0$/, '')} GiB` : `${limit} MiB`;
      } else {
        label = 'Instances';
        used = String(allocated);
        total = String(limit);
      }

      return { label, used, total, pct, hasData: !!bucket };
    });
  }, [quotaBuckets]);

  const yaml = useMemo(() => {
    if (!raw) return '';
    const { metadata, ...rest } = raw as any;
    const { managedFields: _, ...cleanMeta } = metadata ?? {};
    return dump({ ...rest, metadata: cleanMeta }, { indent: 2, lineWidth: -1, noRefs: true });
  }, [raw]);

  if (!workload) return null;

  const allHealthy =
    workload.desiredReplicas > 0 && workload.currentReplicas === workload.desiredReplicas;

  const replicaDisplay =
    workload.replicasPerRegion !== undefined
      ? `${workload.replicasPerRegion} per region · ${workload.desiredReplicas} total`
      : `${workload.desiredReplicas} total`;

  const conditions = workload.conditions ?? [];

  return (
    <div className="m-4 flex flex-col gap-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <span>{workload.name}</span>
            <BadgeState
              state={workloadHealthToBadgeStatus(workload.health)}
              message={workload.health}
            />
          </div>
        }
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<HeartPulseIcon className="size-4" />}
          label="Health"
          value={`${workload.currentReplicas} / ${workload.desiredReplicas}`}
          sub="replicas healthy"
          highlight={allHealthy}
        />
        <StatCard
          icon={<MapPinIcon className="size-4" />}
          label="Region"
          value={workload.regions.length > 0 ? workload.regions.join(', ') : '—'}
        />
        {workload.resources && (
          <StatCard
            icon={<ServerIcon className="size-4" />}
            label="Resources"
            value={workload.resources}
          />
        )}
        <StatCard
          icon={<CopyIcon className="size-4" />}
          label="Replicas"
          value={`${workload.desiredReplicas} total`}
          sub={
            workload.replicasPerRegion !== undefined
              ? `${workload.replicasPerRegion} per region`
              : undefined
          }
        />
      </div>

      {/* Configuration card */}
      <Card className="rounded-xl shadow-none">
        <CardHeader>
          <CardTitle className="mb-0 pb-0 text-base font-semibold">
            <Trans>Configuration</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pt-0 pb-5">
          <dl className="divide-border divide-y text-sm">
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground shrink-0">
                <Trans>Resource name</Trans>
              </dt>
              <dd className="min-w-0 truncate text-right font-mono">{workload.name}</dd>
            </div>
            {workload.runtimeType && (
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground shrink-0">
                  <Trans>Runtime</Trans>
                </dt>
                <dd>{workload.runtimeType}</dd>
              </div>
            )}
            {workload.image && (
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground shrink-0">
                  <Trans>Container image</Trans>
                </dt>
                <dd className="min-w-0 truncate text-right font-mono text-xs">{workload.image}</dd>
              </div>
            )}
            {workload.regions.length > 0 && (
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground shrink-0">
                  <Trans>Regions</Trans>
                </dt>
                <dd>{workload.regions.join(', ')}</dd>
              </div>
            )}
            {workload.resources && (
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground shrink-0">
                  <Trans>Resources</Trans>
                </dt>
                <dd className="font-mono text-xs">{workload.resources}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground shrink-0">
                <Trans>Replicas</Trans>
              </dt>
              <dd>{replicaDisplay}</dd>
            </div>
            {workload.createdAt && (
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground shrink-0">
                  <Trans>Created</Trans>
                </dt>
                <dd className="text-right">
                  <DateTime date={workload.createdAt} />
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Conditions card */}
      {conditions.length > 0 && (
        <Card className="rounded-xl shadow-none">
          <CardHeader className="pb-0">
            <CardTitle className="mb-0 pb-0 text-base font-semibold">
              <Trans>Conditions</Trans>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans>Type</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Status</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Reason</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Message</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Last Transition</Trans>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conditions.map((condition) => (
                  <TableRow key={condition.type}>
                    <TableCell className="font-mono text-xs">{condition.type}</TableCell>
                    <TableCell>
                      <BadgeState
                        state={conditionStatusToBadgeState(condition.status)}
                        message={condition.status}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{condition.reason}</TableCell>
                    <TableCell className="max-w-xs text-xs">{condition.message}</TableCell>
                    <TableCell>
                      <DateTime date={condition.lastTransitionTime} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Compute quota card */}
      {computeQuota.some((q) => q.hasData) && (
        <Card className="rounded-xl shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="mb-0 text-base font-semibold">
              <Trans>Compute Quota</Trans>
            </CardTitle>
            <Link
              to={projectRoutes.quota.usage(projectName)}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors">
              <Trans>View quotas →</Trans>
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="flex flex-col gap-3">
              {computeQuota.filter((q) => q.hasData).map((q) => (
                <div key={q.label} className="flex items-center gap-3">
                  <span className="text-muted-foreground w-20 shrink-0 text-xs font-medium">
                    {q.label}
                  </span>
                  <div className="bg-muted h-2 flex-1 rounded-full">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all',
                        q.pct <= 70 ? 'bg-green-500' : q.pct <= 90 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${Math.min(q.pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-28 shrink-0 text-right text-xs tabular-nums">
                    {q.used} / {q.total}
                  </span>
                  <span
                    className={cn(
                      'w-10 shrink-0 text-right text-xs font-medium tabular-nums',
                      q.pct <= 70 ? 'text-green-600' : q.pct <= 90 ? 'text-yellow-600' : 'text-red-600'
                    )}>
                    {q.pct}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instances card */}
      <Card className="rounded-xl shadow-none">
        <CardHeader className="pb-0">
          <CardTitle className="mb-0 pb-0 text-base font-semibold">
            <Trans>Instances</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          {instances.length === 0 ? (
            <p className="text-muted-foreground py-4 text-sm">No instances running.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Instance Type</TableHead>
                  <TableHead>Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((instance) => (
                  <TableRow key={instance.uid}>
                    <TableCell>
                      <Link
                        to={projectRoutes.workload.instance(
                          projectName,
                          workloadName,
                          instance.name
                        )}
                        className="font-medium underline-offset-2 hover:underline">
                        {instance.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <BadgeState
                        state={instanceStatusToBadgeStatus(instance.status)}
                        message={instance.status}
                      />
                    </TableCell>
                    <TableCell>{instance.city ?? '—'}</TableCell>
                    <TableCell>{instance.placement ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{instance.instanceType ?? '—'}</TableCell>
                    <TableCell>
                      <DateTime date={instance.createdAt} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* YAML card */}
      <Card className="rounded-xl shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">
            <Trans>YAML</Trans>
          </CardTitle>
          <ButtonCopy value={yaml} successMessage="YAML copied to clipboard" tooltipText="Copy YAML" />
        </CardHeader>
        <CardContent>
          <CodeEditor value={yaml} language={'yaml' as EditorLanguage} readOnly minHeight="400px" />
        </CardContent>
      </Card>
    </div>
  );
}
