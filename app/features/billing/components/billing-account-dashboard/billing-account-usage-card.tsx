import { useAccountUsageSpend } from '../../hooks';
import {
  getMeterOptionGroups,
  getServiceSpend,
  getTopMeter,
  type ServiceSpend,
} from '../../lib/account-usage';
import { getAccountCurrency, type BillingAccount } from '../../utils';
import { CardLink, CardMessage, CardQueryState, ShareBar, InlineDate } from './card-parts';
import { SectionCard } from '@/features/milo';
import { toUsageView } from '@/features/organization/usage';
import { MeterAreaChart } from '@/features/organization/usage/components/meter-area-chart';
import { SpendValue } from '@/features/organization/usage/components/spend-value';
import { formatByUnit, formatCurrency } from '@/features/organization/usage/usage.format';
import type { UsageView } from '@/features/organization/usage/usage.view';
import { getCycleProgress } from '@/modules/billing/billing-cycle';
import { orgRoutes } from '@/utils/config/routes.config';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import { useMemo, useState } from 'react';

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
  const { current, isLoading, isError } = useAccountUsageSpend(orgName, account);
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
          <InlineDate date={progress.start} variant="absolute" format="MMM d" timezone="UTC" /> –{' '}
          <InlineDate date={lastDay} variant="absolute" format="MMM d, yyyy" timezone="UTC" /> · day{' '}
          {progress.day} of {progress.days}
        </Trans>
      }
      action={
        <CardLink href={orgRoutes.usage(orgName)}>
          <Trans>Open usage dashboard</Trans>
        </CardLink>
      }>
      <CardQueryState
        isLoading={isLoading}
        isError={isError || (!isLoading && !current)}
        isEmpty={!view}
        skeleton={<UsageSkeleton />}
        error={<Trans>Couldn&apos;t load usage</Trans>}
        empty={
          current && current.usage.status !== 'ok' ? (
            (current.usage.message ?? <Trans>Usage isn&apos;t available for this account</Trans>)
          ) : (
            <Trans>No usage recorded this cycle</Trans>
          )
        }>
        {view ? (
          <UsageBody
            orgName={orgName}
            view={view}
            fallbackCurrency={getAccountCurrency(account)}
            // The whole cycle, so day 3 of 30 doesn't stretch across the chart.
            cycleDomain={[progress.start.getTime(), lastDay.getTime()]}
            now={now}
          />
        ) : null}
      </CardQueryState>
    </SectionCard>
  );
}

function UsageBody({
  orgName,
  view,
  fallbackCurrency,
  cycleDomain,
  now,
}: {
  orgName: string;
  view: UsageView;
  /** The account's currency, for when no meter is priced. */
  fallbackCurrency: string;
  cycleDomain: [number, number];
  now: Date;
}) {
  const groups = useMemo(() => getMeterOptionGroups(view), [view]);
  const services = useMemo(() => getServiceSpend(view), [view]);
  const meters = useMemo(() => groups.flatMap((group) => group.meters), [groups]);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = meters.find((meter) => meter.id === selectedId) ?? getTopMeter(view);
  const selectedService = groups.find((group) =>
    group.meters.some((meter) => meter.id === selected?.id)
  );
  const currency =
    view.spend?.currency ??
    meters.find((meter) => meter.spend)?.spend?.currency ??
    fallbackCurrency;

  return (
    <div className="@container/usage">
      <div className="grid grid-cols-1 gap-6 @2xl/usage:grid-cols-[minmax(0,1fr)_240px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Text as="span" size="2xl" weight="semibold">
              <SpendValue
                spend={view.spendError ? undefined : view.spend}
                spendError={view.spendError}
              />
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
                    {groups.map((group, index) => (
                      <SelectGroup key={group.id}>
                        {index > 0 ? <SelectSeparator /> : null}
                        <SelectLabel className="text-muted-foreground pt-2 pb-1 text-xs font-medium tracking-wide uppercase">
                          {group.title}
                        </SelectLabel>
                        {group.meters.map((meter) => (
                          <SelectItem key={meter.id} value={meter.id}>
                            <span className="flex items-center gap-2 pr-6">
                              <span className="truncate">{meter.label}</span>
                              {meter.spend && meter.spend.amount > 0 ? (
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
              {selected.series.length === 0 ? (
                <Text
                  as="div"
                  size="sm"
                  textColor="muted"
                  className="flex items-center justify-center"
                  style={{ height: CHART_HEIGHT }}>
                  <Trans>No daily usage recorded for this meter.</Trans>
                </Text>
              ) : (
                <MeterAreaChart
                  key={selected.id}
                  id={`account-${selected.id}`}
                  label={selected.label}
                  unit={selected.unit}
                  series={selected.series}
                  height={CHART_HEIGHT}
                  showDots={false}
                  domain={cycleDomain}
                  marker={now.getTime()}
                />
              )}
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
                'hover:bg-background flex w-full flex-col gap-1.5 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors',
                // An outline rather than a fill, so the share bar stays visible.
                service.id === selectedServiceId && 'border-border bg-background shadow-xs'
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
            <Plural
              value={more}
              one="# more service in the usage dashboard"
              other="# more services in the usage dashboard"
            />
          </CardLink>
        </div>
      ) : null}
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
