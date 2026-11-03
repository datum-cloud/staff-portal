import {
  getCycleProgress,
  getMeterOptionGroups,
  getServiceSpend,
  getTopMeter,
  type ServiceSpend,
} from '../../lib/account-usage';
import { CardLink, CardMessage, ShareBar } from './card-parts';
import { useAccountUsageSpend } from './use-account-dashboard';
import { DateTime } from '@/components/date';
import { SectionCard } from '@/features/milo';
import { toUsageView } from '@/features/organization/usage';
import {
  formatAxisValue,
  formatByUnit,
  formatCurrency,
} from '@/features/organization/usage/usage.format';
import type { UsageMeter } from '@/features/organization/usage/usage.types';
import type { UsageView } from '@/features/organization/usage/usage.view';
import { orgRoutes } from '@/utils/config/routes.config';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type BillingAccount = ComMiloapisBillingV1Alpha1BillingAccount;

interface UsageCardProps {
  orgName: string;
  account: BillingAccount;
  now: Date;
}

const TOP_SERVICES = 3;
const CHART_HEIGHT = 200;

/**
 * This cycle's usage for the account: spend so far, one meter's daily usage
 * (opening on the highest spend) and spend by service.
 */
export function BillingAccountUsageCard({ orgName, account, now }: UsageCardProps) {
  const { current, isLoading, isError } = useAccountUsageSpend(orgName, account, now);
  const progress = useMemo(
    () => getCycleProgress(account.spec?.paymentTerms, now),
    [account.spec?.paymentTerms, now]
  );
  const view = useMemo(
    () => (current?.usage.status === 'ok' ? toUsageView(current.usage) : null),
    [current]
  );
  // The cycle's last day; `progress.end` is the next cycle's first.
  const lastDay = new Date(progress.end.getTime() - 1);

  return (
    <SectionCard
      title={<Trans>Usage this billing cycle</Trans>}
      description={
        <Trans>
          <DateTime date={progress.start} variant="absolute" format="MMM d" tooltip={false} /> –{' '}
          <DateTime date={lastDay} variant="absolute" format="MMM d, yyyy" tooltip={false} /> · day{' '}
          {progress.day} of {progress.days}
        </Trans>
      }
      action={
        <CardLink href={orgRoutes.usage(orgName)}>
          <Trans>Open usage dashboard</Trans>
        </CardLink>
      }>
      {isLoading ? (
        <UsageSkeleton />
      ) : isError || !current ? (
        <CardMessage>
          <Trans>Couldn&apos;t load usage.</Trans>
        </CardMessage>
      ) : current.usage.status !== 'ok' ? (
        <CardMessage>
          {current.usage.message ?? <Trans>Usage isn&apos;t available for this account.</Trans>}
        </CardMessage>
      ) : !view ? (
        <CardMessage>
          <Trans>No usage recorded this cycle.</Trans>
        </CardMessage>
      ) : (
        <UsageBody orgName={orgName} view={view} />
      )}
    </SectionCard>
  );
}

function UsageBody({ orgName, view }: { orgName: string; view: UsageView }) {
  const groups = useMemo(() => getMeterOptionGroups(view), [view]);
  const services = useMemo(() => getServiceSpend(view), [view]);
  const meters = useMemo(() => groups.flatMap((group) => group.meters), [groups]);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = meters.find((meter) => meter.id === selectedId) ?? getTopMeter(view);
  const selectedService = groups.find((group) =>
    group.meters.some((meter) => meter.id === selected?.id)
  );
  const currency =
    view.spend?.currency ?? meters.find((meter) => meter.spend)?.spend?.currency ?? 'USD';

  return (
    <div className="@container/usage">
      <div className="grid grid-cols-1 gap-6 @2xl/usage:grid-cols-[minmax(0,1fr)_240px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Text as="span" size="2xl" weight="semibold" className="tabular-nums">
              {view.spendError ? '—' : formatCurrency(view.spend)}
            </Text>
            <Text as="span" size="sm" textColor="muted">
              {view.spendError ? (
                <Trans>Spend isn&apos;t available</Trans>
              ) : (
                <Trans>spent so far, before tax and credits</Trans>
              )}
            </Text>
          </div>

          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Select value={selected.id} onValueChange={setSelectedId}>
                  <SelectTrigger
                    className="h-9 min-h-9 w-full text-sm sm:w-64"
                    aria-label={t`Meter`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectGroup key={group.id}>
                        <SelectLabel>{group.title}</SelectLabel>
                        {group.meters.map((meter) => (
                          <SelectItem key={meter.id} value={meter.id}>
                            <span className="flex w-full items-center gap-2">
                              <span className="truncate">{meter.label}</span>
                              {meter.spend ? (
                                <span className="text-muted-foreground tabular-nums">
                                  {formatCurrency(meter.spend)}
                                </span>
                              ) : null}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                <Text size="sm" textColor="muted" className="tabular-nums">
                  <Text as="span" size="sm" weight="medium" textColor="default">
                    {formatByUnit(selected.unit, selected.used)}
                  </Text>{' '}
                  {selected.qualifier ? (
                    <Trans>{selected.qualifier} this cycle</Trans>
                  ) : (
                    <Trans>this cycle</Trans>
                  )}
                  {selectedService ? ` · ${selectedService.title}` : null} ·{' '}
                  <Trans>daily usage</Trans>
                </Text>
              </div>
              <UsageChart meter={selected} />
            </>
          ) : null}
        </div>

        <ServiceSpendList
          orgName={orgName}
          services={services}
          currency={currency}
          selectedServiceId={selectedService?.id}
          onSelect={(service) => setSelectedId(service.topMeterId)}
        />
      </div>
    </div>
  );
}

function ServiceSpendList({
  orgName,
  services,
  currency,
  selectedServiceId,
  onSelect,
}: {
  orgName: string;
  services: ServiceSpend[];
  currency: string;
  selectedServiceId?: string;
  onSelect: (service: ServiceSpend) => void;
}) {
  const top = services.slice(0, TOP_SERVICES);
  const more = services.length - top.length;
  const total = services.reduce((sum, service) => sum + service.amount, 0);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Text size="xs" weight="medium" textColor="muted" className="mb-1 uppercase">
        <Trans>Spend by service</Trans>
      </Text>
      <ul className="flex flex-col gap-1">
        {top.map((service) => (
          <li key={service.id}>
            <button
              type="button"
              aria-pressed={service.id === selectedServiceId}
              onClick={() => onSelect(service)}
              className={cn(
                'hover:bg-muted/60 flex w-full flex-col gap-1.5 rounded-md px-2.5 py-2 text-left transition-colors',
                service.id === selectedServiceId && 'bg-muted'
              )}>
              <span className="flex items-center justify-between gap-2">
                <Text as="span" size="sm" ellipsis>
                  {service.title}
                </Text>
                <Text as="span" size="sm" weight="medium" className="tabular-nums">
                  {formatCurrency({ amount: service.amount, currency })}
                </Text>
              </span>
              <ShareBar value={service.amount} max={total} />
            </button>
          </li>
        ))}
      </ul>
      {more > 0 ? (
        <div className="px-0.5">
          <CardLink href={orgRoutes.usage(orgName)}>
            {more === 1 ? (
              <Trans>1 more service in the usage dashboard</Trans>
            ) : (
              <Trans>{more} more services in the usage dashboard</Trans>
            )}
          </CardLink>
        </div>
      ) : null}
    </div>
  );
}

/** One meter's daily usage, styled like the org usage page's `MeterCard`. */
function UsageChart({ meter }: { meter: UsageMeter }) {
  const fillId = `account-usage-fill-${meter.id}`.replace(/[^a-zA-Z0-9_-]/g, '-');

  if (meter.series.length === 0) {
    return (
      <Text
        as="div"
        size="sm"
        textColor="muted"
        className="flex items-center justify-center"
        style={{ height: CHART_HEIGHT }}>
        <Trans>No daily usage recorded for this meter.</Trans>
      </Text>
    );
  }

  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer key={meter.id} width="100%" height={CHART_HEIGHT}>
        <AreaChart data={meter.series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(ts) => format(new Date(ts), 'MMM d')}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) =>
              formatAxisValue(meter.unit, typeof value === 'number' ? value : 0)
            }
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border)' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="border-border bg-background rounded-md border px-2.5 py-1.5 shadow-sm">
                  <Text as="div" size="xs" textColor="muted">
                    {format(new Date(label as number), 'MMM d, yyyy')}
                  </Text>
                  <Text as="div" size="xs" weight="medium" textColor="default">
                    {meter.label}:{' '}
                    {formatByUnit(
                      meter.unit,
                      typeof payload[0].value === 'number' ? payload[0].value : 0
                    )}
                  </Text>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            fill={`url(#${fillId})`}
            activeDot={{
              r: 4,
              fill: 'var(--primary)',
              stroke: 'var(--background)',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function UsageSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 @5xl/main:grid-cols-[minmax(0,1fr)_240px]"
      aria-busy="true">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-9 w-64 rounded" />
        <Skeleton className="w-full rounded" style={{ height: CHART_HEIGHT }} />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28 rounded" />
        {Array.from({ length: TOP_SERVICES }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded" />
        ))}
      </div>
    </div>
  );
}
