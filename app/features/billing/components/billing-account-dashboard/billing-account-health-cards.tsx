import { isUsageSpike, type UsageSpendComparison } from '../../lib/account-health';
import { getNextInvoice, summarizeInvoices, type InvoiceSummary } from '../../lib/invoice-summary';
import { formatMoney, getAccountCurrency } from '../../utils';
import { frequencyLabel, InlineDate } from './card-parts';
import { useAccountInvoices, useAccountUsageSpend } from './use-account-dashboard';
import {
  StatTile,
  StatTileDetail,
  StatTileHeadline,
  StatTileMessage,
  StatTileSkeleton,
} from '@/components/stat-tile';
import { SpendValue } from '@/features/organization/usage/components/spend-value';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { ArrowDown, ArrowUp, CircleAlert } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

type BillingAccount = ComMiloapisBillingV1Alpha1BillingAccount;

interface HealthCardsProps {
  orgName: string;
  account: BillingAccount;
  now: Date;
}

/**
 * A tile from the account's invoice summary, rendered by `render` once
 * loaded. Every invoice tile calls this; React Query shares the one request.
 * When the org has more invoices than were read, totals are a floor: the
 * figure gets a "+" and the tile says it's partial.
 */
function InvoiceTile({
  orgName,
  account,
  now,
  title,
  render,
}: HealthCardsProps & {
  title: ReactNode;
  render: (summary: InvoiceSummary, more: string) => ReactNode;
}) {
  const { invoices, hasMore, isLoading, isError } = useAccountInvoices(
    orgName,
    account.metadata?.name ?? ''
  );
  const summary = useMemo(
    () => (invoices ? summarizeInvoices(invoices, now) : undefined),
    [invoices, now]
  );

  return (
    <StatTile
      title={title}
      windowLabel={hasMore ? <Trans>Partial: not every invoice loaded</Trans> : undefined}>
      {isLoading ? (
        <StatTileSkeleton />
      ) : isError || !summary ? (
        <StatTileMessage>
          <Trans>Couldn&apos;t load invoices.</Trans>
        </StatTileMessage>
      ) : (
        render(summary, hasMore ? '+' : '')
      )}
    </StatTile>
  );
}

function OutstandingTile(props: HealthCardsProps) {
  const currency = getAccountCurrency(props.account);
  return (
    <InvoiceTile
      {...props}
      title={<Trans>Outstanding balance</Trans>}
      render={(s, more) => (
        <>
          <StatTileHeadline>{`${formatMoney(s.outstanding, currency)}${more}`}</StatTileHeadline>
          <StatTileDetail>
            {s.unpaidCount === 0 ? (
              <Trans>Nothing owed</Trans>
            ) : s.unpaidCount === 1 ? (
              <Trans>1 unpaid invoice</Trans>
            ) : (
              <Trans>{s.unpaidCount} unpaid invoices</Trans>
            )}
          </StatTileDetail>
        </>
      )}
    />
  );
}

function PastDueTile(props: HealthCardsProps) {
  const currency = getAccountCurrency(props.account);
  return (
    <InvoiceTile
      {...props}
      title={<Trans>Past due</Trans>}
      render={(s) =>
        s.pastDueCount === 0 ? (
          <>
            <StatTileHeadline>{formatMoney(0, currency)}</StatTileHeadline>
            <StatTileDetail>
              <Trans>Nothing past due</Trans>
            </StatTileDetail>
          </>
        ) : (
          <>
            <StatTileHeadline
              className="text-destructive"
              icon={<Icon icon={CircleAlert} size={18} className="shrink-0" aria-hidden />}>
              {formatMoney(s.pastDue, currency)}
            </StatTileHeadline>
            <StatTileDetail>
              <PastDueDetail count={s.pastDueCount} days={s.maxDaysOverdue} />
            </StatTileDetail>
          </>
        )
      }
    />
  );
}

function PastDueDetail({ count, days }: { count: number; days: number }) {
  const invoices = <Plural value={count} one="# invoice" other="# invoices" />;
  if (days <= 0) return invoices;
  const overdue = <Plural value={days} one="# day" other="# days" />;
  return count === 1 ? (
    <Trans>
      {invoices} · {overdue} overdue
    </Trans>
  ) : (
    <Trans>
      {invoices} · oldest {overdue} overdue
    </Trans>
  );
}

function LifetimePaidTile(props: HealthCardsProps) {
  const currency = getAccountCurrency(props.account);
  return (
    <InvoiceTile
      {...props}
      title={<Trans>Lifetime paid</Trans>}
      render={(s, more) => (
        <>
          <StatTileHeadline>{`${formatMoney(s.lifetimePaid, currency)}${more}`}</StatTileHeadline>
          <StatTileDetail>
            {s.paidCount === 1 ? (
              <Trans>1 paid invoice</Trans>
            ) : (
              <Trans>{s.paidCount} paid invoices</Trans>
            )}
          </StatTileDetail>
        </>
      )}
    />
  );
}

function UsageTrend({ comparison }: { comparison: UsageSpendComparison }) {
  const { current, previous } = comparison;
  if (previous <= 0) {
    return (
      <StatTileDetail>
        <Trans>No spend last cycle at this point</Trans>
      </StatTileDetail>
    );
  }
  const factor = current / previous;
  if (isUsageSpike(comparison)) {
    const times = Math.round(factor);
    return (
      <StatTileDetail className="text-warning flex items-center gap-1">
        <Icon icon={ArrowUp} size={12} className="shrink-0" aria-hidden />
        <Trans>{times}× last cycle at this point</Trans>
      </StatTileDetail>
    );
  }
  const percent = Math.round(Math.abs(factor - 1) * 100);
  if (percent === 0) {
    return (
      <StatTileDetail>
        <Trans>Same as last cycle at this point</Trans>
      </StatTileDetail>
    );
  }
  return (
    <StatTileDetail className="flex items-center gap-1">
      <Icon icon={factor > 1 ? ArrowUp : ArrowDown} size={12} className="shrink-0" aria-hidden />
      <Trans>{percent}% vs last cycle at this point</Trans>
    </StatTileDetail>
  );
}

function UsageTile({ orgName, account }: HealthCardsProps) {
  const { current, comparison, isLoading, isComparisonLoading, isError } = useAccountUsageSpend(
    orgName,
    account
  );

  return (
    <StatTile title={<Trans>Usage this cycle</Trans>}>
      {isLoading ? (
        <StatTileSkeleton />
      ) : isError || !current ? (
        <StatTileMessage>
          <Trans>Couldn&apos;t load usage.</Trans>
        </StatTileMessage>
      ) : current.usage.status !== 'ok' ? (
        <StatTileMessage>
          <Trans>Usage isn&apos;t available.</Trans>
        </StatTileMessage>
      ) : (
        <>
          <StatTileHeadline>
            <SpendValue
              spend={
                current.usage.spendError
                  ? undefined
                  : (current.usage.spend ?? { amount: 0, currency: getAccountCurrency(account) })
              }
              spendError={current.usage.spendError}
            />
          </StatTileHeadline>
          {comparison ? (
            <UsageTrend comparison={comparison} />
          ) : isComparisonLoading ? (
            <Skeleton className="h-4 w-32 rounded" />
          ) : null}
        </>
      )}
    </StatTile>
  );
}

/** Dates come from the account's payment terms, so there's nothing to load. */
function NextInvoiceTile({ account, now }: HealthCardsProps) {
  const next = useMemo(() => getNextInvoice(account, now), [account, now]);
  const frequency = frequencyLabel(next.frequency);

  return (
    <StatTile title={<Trans>Next invoice</Trans>}>
      <StatTileHeadline>
        <InlineDate date={next.issuedAt} variant="absolute" format="MMM d, yyyy" timezone="UTC" />
      </StatTileHeadline>
      <StatTileDetail>
        {next.dueAt ? (
          <Trans>
            {frequency} · due{' '}
            <InlineDate date={next.dueAt} variant="absolute" format="MMM d" timezone="UTC" /> (net{' '}
            {next.netDays})
          </Trans>
        ) : (
          frequency
        )}
      </StatTileDetail>
    </StatTile>
  );
}

/** The dashboard's headline numbers. Each tile loads and fails on its own. */
export function BillingAccountHealthCards(props: HealthCardsProps) {
  return (
    <section
      aria-label={t`Account summary`}
      className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
      <OutstandingTile {...props} />
      <PastDueTile {...props} />
      <UsageTile {...props} />
      <NextInvoiceTile {...props} />
      <LifetimePaidTile {...props} />
    </section>
  );
}
