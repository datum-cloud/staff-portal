import type { Route } from './+types/overview';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import {
  useServiceConfigurationsByServiceQuery,
  useServiceDetailQuery,
  type ServiceConfiguration,
} from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';
import { useParams } from 'react-router';

export const meta: Route.MetaFunction = ({ params }) => {
  return metaObject(t`Overview — ${params.name ?? ''}`);
};

function pickActiveConfiguration(
  configs: ServiceConfiguration[]
): ServiceConfiguration | undefined {
  const published = configs.filter((c) => c.spec?.phase === 'Published');
  if (published.length === 0) return undefined;
  return published.slice().sort((a, b) => {
    const at = a.status?.publishedAt ?? a.metadata?.creationTimestamp ?? '';
    const bt = b.status?.publishedAt ?? b.metadata?.creationTimestamp ?? '';
    return bt.localeCompare(at);
  })[0];
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" textColor="muted" className="tracking-wide uppercase">
      {children}
    </Text>
  );
}

function Panel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-col gap-3 p-4">
        <Text size="sm" className="font-medium">
          {title}
        </Text>
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyPanelBody({ message }: { message: React.ReactNode }) {
  return (
    <Text size="sm" textColor="muted" className="italic">
      {message}
    </Text>
  );
}

export default function ServiceOverviewPage() {
  const { name } = useParams<{ name: string }>();
  const serviceName = name ?? '';

  const { data: service } = useServiceDetailQuery(serviceName);
  const {
    data: configList,
    isLoading,
    error,
    refetch,
  } = useServiceConfigurationsByServiceQuery(serviceName);

  const filtered = useMemo(() => {
    return (configList?.items ?? []).filter((c) => c.spec?.serviceRef?.name === serviceName);
  }, [configList, serviceName]);

  const active = useMemo(() => pickActiveConfiguration(filtered), [filtered]);

  if (error) {
    const is403 =
      error instanceof Error &&
      (error.message.includes('403') || error.message.includes('Forbidden'));
    return (
      <Card className="m-4 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Text size="sm" textColor="muted">
            {is403 ? (
              <Trans>You do not have permission to view service configurations.</Trans>
            ) : (
              <Trans>Failed to load service configurations.</Trans>
            )}
          </Text>
          {!is403 && (
            <Text size="sm" textColor="muted" className="font-mono text-xs">
              {error instanceof Error ? error.message : String(error)}
            </Text>
          )}
          {!is403 && (
            <button onClick={() => refetch()} className="text-primary text-sm hover:underline">
              <Trans>Retry</Trans>
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-none">
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="bg-muted h-4 w-32 rounded" />
                  <div className="bg-muted h-3 w-full rounded" />
                  <div className="bg-muted h-3 w-3/4 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const spec = service?.spec;
  const monitoredResources = active?.spec?.monitoredResourceTypes ?? [];
  const metrics = active?.spec?.metrics ?? [];
  const quotaLimits = active?.spec?.quota?.limits ?? [];
  const conditions = active?.status?.conditions ?? [];

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <SectionHeading>
          <Trans>Active Configuration</Trans>
        </SectionHeading>
        {active ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Text size="sm" className="font-mono">
              {active.metadata?.name}
            </Text>
            {active.spec?.version && (
              <Text size="xs" textColor="muted">
                <Trans>Version</Trans> <span className="font-mono">{active.spec.version}</span>
              </Text>
            )}
            {active.status?.publishedAt && (
              <Text size="xs" textColor="muted">
                <Trans>Published</Trans>{' '}
                <DateTime date={active.status.publishedAt} variant="relative" addSuffix />
              </Text>
            )}
          </div>
        ) : (
          <Text size="sm" textColor="muted">
            {filtered.length === 0 ? (
              <Trans>No service configurations have been registered yet.</Trans>
            ) : (
              <Trans>
                No Published configuration. Drafts are not fanned out to billing or quota.
              </Trans>
            )}
          </Text>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title={<Trans>Monitored Resources</Trans>}>
          {monitoredResources.length === 0 ? (
            <EmptyPanelBody message={<Trans>None declared.</Trans>} />
          ) : (
            <div className="flex flex-col divide-y">
              {monitoredResources.map((mr) => (
                <div key={mr.type} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                  <Text size="sm" className="font-medium">
                    {mr.displayName ?? mr.type}
                  </Text>
                  <Text size="xs" textColor="muted" className="font-mono">
                    {mr.type}
                  </Text>
                  {mr.description && (
                    <Text size="xs" textColor="muted">
                      {mr.description}
                    </Text>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={<Trans>Meters</Trans>}>
          {metrics.length === 0 ? (
            <EmptyPanelBody message={<Trans>None declared.</Trans>} />
          ) : (
            <div className="flex flex-col divide-y">
              {metrics.map((m) => (
                <div key={m.name} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                  <div className="flex items-baseline gap-2">
                    <Text size="sm" className="font-medium">
                      {m.displayName ?? m.name}
                    </Text>
                    <BadgeState state="info" message={m.kind} />
                    <Text size="xs" textColor="muted" className="font-mono">
                      {m.unit}
                    </Text>
                  </div>
                  <Text size="xs" textColor="muted" className="font-mono">
                    {m.name}
                  </Text>
                  {m.description && (
                    <Text size="xs" textColor="muted">
                      {m.description}
                    </Text>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={<Trans>Details</Trans>}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex flex-col gap-0.5">
              <Text size="xs" textColor="muted">
                <Trans>Service Name</Trans>
              </Text>
              <Text size="sm" className="font-mono">
                {spec?.serviceName ?? '-'}
              </Text>
            </div>
            <div className="flex flex-col gap-0.5">
              <Text size="xs" textColor="muted">
                <Trans>Display Name</Trans>
              </Text>
              <Text size="sm">{spec?.displayName ?? '-'}</Text>
            </div>
            <div className="flex flex-col gap-0.5">
              <Text size="xs" textColor="muted">
                <Trans>Phase</Trans>
              </Text>
              <div>
                {spec?.phase ? <BadgeState state={spec.phase} /> : <Text size="sm">-</Text>}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <Text size="xs" textColor="muted">
                <Trans>Enablement</Trans>
              </Text>
              <div>
                <BadgeState
                  state={spec?.enablementPolicy?.mode === 'GatedByProvider' ? 'warning' : 'info'}
                  message={
                    spec?.enablementPolicy?.mode === 'GatedByProvider'
                      ? t`Gated by Provider`
                      : t`Self Service`
                  }
                />
              </div>
            </div>
            <div className="col-span-2 flex flex-col gap-0.5">
              <Text size="xs" textColor="muted">
                <Trans>Owner</Trans>
              </Text>
              <Text size="sm" className="font-mono">
                {spec?.owner?.producerProjectRef?.name ?? '-'}
              </Text>
            </div>
          </div>
        </Panel>

        <Panel title={<Trans>Quota</Trans>}>
          {quotaLimits.length === 0 ? (
            <EmptyPanelBody message={<Trans>No quota limits declared.</Trans>} />
          ) : (
            <div className="flex flex-col divide-y">
              {quotaLimits.map((q) => (
                <div key={q.name} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                  <Text size="sm" className="font-medium">
                    {q.name}
                  </Text>
                  <Text size="xs" textColor="muted" className="font-mono">
                    {q.metric} · default {q.defaultLimit}
                    {q.maxLimit ? ` · max ${q.maxLimit}` : ''} · {q.unit}
                  </Text>
                  <Text size="xs" textColor="muted">
                    <Trans>per</Trans>{' '}
                    <span className="font-mono">
                      {q.consumerType.apiGroup}/{q.consumerType.kind}
                    </span>
                  </Text>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title={<Trans>Conditions</Trans>}>
        {conditions.length === 0 ? (
          <EmptyPanelBody
            message={
              active ? (
                <Trans>No conditions reported.</Trans>
              ) : (
                <Trans>No active configuration.</Trans>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs tracking-wide uppercase">
                  <th className="pr-4 pb-2 font-medium">
                    <Trans>Type</Trans>
                  </th>
                  <th className="pr-4 pb-2 font-medium">
                    <Trans>Status</Trans>
                  </th>
                  <th className="pr-4 pb-2 font-medium">
                    <Trans>Reason</Trans>
                  </th>
                  <th className="pr-4 pb-2 font-medium">
                    <Trans>Message</Trans>
                  </th>
                  <th className="pb-2 font-medium">
                    <Trans>Updated</Trans>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {conditions.map((c) => (
                  <tr key={c.type} className="align-top">
                    <td className="py-2 pr-4 font-mono text-xs">{c.type}</td>
                    <td className="py-2 pr-4">
                      <BadgeState
                        state={
                          c.status === 'True'
                            ? 'active'
                            : c.status === 'False'
                              ? 'error'
                              : 'pending'
                        }
                        message={c.status}
                      />
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{c.reason}</td>
                    <td className="py-2 pr-4">{c.message}</td>
                    <td className="text-muted-foreground py-2 text-xs">
                      <DateTime date={c.lastTransitionTime} variant="relative" addSuffix />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
