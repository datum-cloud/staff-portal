import type { Route } from './+types/instance';
import { BadgeState } from '@/components/badge';
import { ButtonCopy } from '@/components/button';
import { DateTime } from '@/components/date';
import { PageHeader } from '@/components/page-header';
import { authenticator } from '@/modules/auth';
import { toInstance, instanceStatusToBadgeStatus, type Instance } from '@/resources/instances';
import { projectInstanceDetailQuery } from '@/resources/request/server';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { CodeEditor, type EditorLanguage } from '@datum-cloud/datum-ui/code-editor';
import { Trans } from '@lingui/react/macro';
import { dump } from 'js-yaml';
import {
  BoxIcon,
  CheckCircle2Icon,
  CircleIcon,
  CpuIcon,
  GlobeIcon,
  LinkIcon,
  TimerIcon,
  WifiIcon,
  XCircleIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { useLoaderData } from 'react-router';
import type { InstanceCondition } from '@/resources/instances';

export const handle = {
  breadcrumb: (data: { instance: Instance }) => (
    <span>{data?.instance?.name ?? 'Instance'}</span>
  ),
};

export const meta: Route.MetaFunction = () => {
  return metaObject('Instance');
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const raw = await projectInstanceDetailQuery(
    session?.accessToken ?? '',
    params.projectName ?? '',
    params.instanceName ?? ''
  );
  const instance = toInstance(raw as any);
  return { raw, instance };
};

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card className="rounded-xl py-0 shadow-none">
      <div className="flex items-start gap-3 p-4">
        <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </span>
          <span className="text-foreground truncate font-semibold">{value}</span>
          {sub && <span className="text-muted-foreground truncate text-xs">{sub}</span>}
        </div>
      </div>
    </Card>
  );
}

function ConditionIcon({ status }: { status: InstanceCondition['status'] }) {
  if (status === 'True')
    return <CheckCircle2Icon className="text-success mt-0.5 size-4 shrink-0" />;
  if (status === 'False')
    return <XCircleIcon className="text-destructive mt-0.5 size-4 shrink-0" />;
  return <CircleIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />;
}

export default function InstanceDetailPage() {
  const { raw, instance } = useLoaderData<typeof loader>();

  const yaml = useMemo(() => {
    if (!raw) return '';
    const { metadata, ...rest } = raw as any;
    const { managedFields: _, ...cleanMeta } = metadata ?? {};
    return dump({ ...rest, metadata: cleanMeta }, { indent: 2, lineWidth: -1, noRefs: true });
  }, [raw]);

  if (!instance) return null;

  const hasNetwork = !!(instance.externalIP || instance.internalIP);

  return (
    <div className="m-4 flex flex-col gap-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <span>{instance.name}</span>
            <BadgeState
              state={instanceStatusToBadgeStatus(instance.status)}
              message={instance.status}
            />
          </div>
        }
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<TimerIcon className="size-4" />}
          label="Age"
          value={<DateTime date={instance.createdAt} />}
        />
        <StatCard
          icon={<GlobeIcon className="size-4" />}
          label="City"
          value={instance.city ?? '—'}
        />
        {instance.instanceType && (
          <StatCard
            icon={<CpuIcon className="size-4" />}
            label="Instance Type"
            value={instance.instanceType}
          />
        )}
        {instance.image && (
          <StatCard
            icon={<BoxIcon className="size-4" />}
            label="Image"
            value={instance.image}
          />
        )}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Network */}
        {hasNetwork && (
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                <Trans>Network</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-5 pt-0 pb-5">
              {instance.externalIP && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    External Endpoint
                  </span>
                  <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2.5">
                    <LinkIcon className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="text-primary min-w-0 flex-1 break-all text-sm font-mono">
                      {instance.externalIP}
                    </span>
                    <ButtonCopy
                      value={instance.externalIP}
                      successMessage="External IP copied"
                      tooltipText="Copy external IP"
                    />
                  </div>
                </div>
              )}
              {instance.internalIP && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Internal IP
                  </span>
                  <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2.5">
                    <WifiIcon className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-mono text-sm">
                      {instance.internalIP}
                    </span>
                    <ButtonCopy
                      value={instance.internalIP}
                      successMessage="Internal IP copied"
                      tooltipText="Copy internal IP"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Health Conditions */}
          {instance.conditions.length > 0 && (
            <Card className="rounded-xl shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  <Trans>Health Conditions</Trans>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pt-0 pb-5">
                <dl className="divide-border divide-y text-sm">
                  {instance.conditions.map((c) => (
                    <div key={c.type} className="flex items-start gap-2.5 py-2.5">
                      <ConditionIcon status={c.status} />
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium">{c.type}</span>
                        {(c.message || c.reason) && (
                          <span className="text-muted-foreground text-xs">
                            {c.message || c.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Runtime */}
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                <Trans>Runtime</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-0 pb-5">
              <dl className="divide-border divide-y text-sm">
                {instance.image && (
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground shrink-0">
                      <Trans>Image</Trans>
                    </dt>
                    <dd className="min-w-0 truncate text-right font-mono text-xs">
                      {instance.image}
                    </dd>
                  </div>
                )}
                {instance.ports.length > 0 && (
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground shrink-0">
                      <Trans>Ports</Trans>
                    </dt>
                    <dd className="font-mono text-xs">{instance.ports.join(', ')}</dd>
                  </div>
                )}
                {instance.placement && (
                  <div className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground shrink-0">
                      <Trans>Placement</Trans>
                    </dt>
                    <dd>{instance.placement}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-muted-foreground shrink-0">
                    <Trans>Created</Trans>
                  </dt>
                  <dd className="text-right">
                    <DateTime date={instance.createdAt} />
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

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
