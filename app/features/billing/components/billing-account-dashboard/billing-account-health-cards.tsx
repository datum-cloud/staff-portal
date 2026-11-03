import { USAGE_SPIKE_FACTOR, type UsageSpendComparison } from '../../lib/account-health';
import {
  getNextInvoice,
  summarizeInvoices,
  type InvoiceSummary,
  type NextInvoice,
} from '../../lib/invoice-summary';
import { useAccountInvoices, useAccountUsageSpend } from './use-account-dashboard';
import { DateTime } from '@/components/date';
import { formatCurrency } from '@/features/organization/usage/usage.format';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { ArrowDown, ArrowUp, CircleAlert } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

type BillingAccount = ComMiloapisBillingV1Alpha1BillingAccount;

interface HealthCardsProps {
  orgName: string;
  account: BillingAccount;
  now: Date;
}

const accountCurrency = (account: BillingAccount) => account.spec?.currencyCode ?? 'USD';

const money = (amount: number, currency: string) => formatCurrency({ amount, currency });

const frequencyLabel = (frequency: NextInvoice['frequency']): string => {
  switch (frequency) {
    case 'Quarterly':
      return t`Quarterly`;
    case 'Annual':
      return t`Annual`;
    default:
      return t`Monthly`;
  }
};

// Tile chrome mirrors the platform home's HealthCard (dashboard/home/health-section).

function Tile({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Card size="sm" className="h-full w-full">
      <CardContent className="flex min-w-0 flex-col gap-2">
        <Text size="xs" weight="medium" textColor="muted" className="flex h-4 items-center">
          {title}
        </Text>
        {children}
      </CardContent>
    </Card>
  );
}

function TileSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-20 rounded" />
      <Skeleton className="h-4 w-32 rounded" />
    </>
  );
}

function TileMessage({ children }: { children: ReactNode }) {
  return (
    <Text size="sm" textColor="muted" className="flex h-8 items-center">
      {children}
    </Text>
  );
}

function Headline({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Text
      as="div"
      size="2xl"
      weight="semibold"
      textColor="default"
      className={cn('flex h-8 min-w-0 items-center gap-2 truncate tabular-nums', className)}>
      {children}
    </Text>
  );
}

function Detail({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Text size="xs" textColor="muted" ellipsis className={cn('tabular-nums', className)}>
      {children}
    </Text>
  );
}

/**
 * The account's invoice summary, rendered by `render` once loaded. Every
 * invoice tile calls this; React Query shares the one request between them.
 */
function InvoiceTileBody({
  orgName,
  account,
  now,
  render,
}: HealthCardsProps & { render: (summary: InvoiceSummary, more: string) => ReactNode }) {
  const { invoices, hasMore, isLoading, isError } = useAccountInvoices(
    orgName,
    account.metadata?.name ?? ''
  );
  const summary = useMemo(
    () => (invoices ? summarizeInvoices(invoices, now) : undefined),
    [invoices, now]
  );

  if (isLoading) return <TileSkeleton />;
  if (isError || !summary) {
    return (
      <TileMessage>
        <Trans>Couldn&apos;t load invoices.</Trans>
      </TileMessage>
    );
  }
  // Some of the org's invoices weren't read, so totals are a floor.
  return render(summary, hasMore ? '+' : '');
}

function OutstandingTile(props: HealthCardsProps) {
  const currency = accountCurrency(props.account);
  return (
    <Tile title={<Trans>Outstanding balance</Trans>}>
      <InvoiceTileBody
        {...props}
        render={(s, more) => (
          <>
            <Headline>
              {money(s.outstanding, currency)}
              {more}
            </Headline>
            <Detail>
              {s.unpaidCount === 0 ? (
                <Trans>Nothing owed</Trans>
              ) : s.unpaidCount === 1 ? (
                <Trans>1 unpaid invoice</Trans>
              ) : (
                <Trans>{s.unpaidCount} unpaid invoices</Trans>
              )}
            </Detail>
          </>
        )}
      />
    </Tile>
  );
}

function PastDueTile(props: HealthCardsProps) {
  const currency = accountCurrency(props.account);
  return (
    <Tile title={<Trans>Past due</Trans>}>
      <InvoiceTileBody
        {...props}
        render={(s) =>
          s.pastDueCount === 0 ? (
            <>
              <Headline>{money(0, currency)}</Headline>
              <Detail>
                <Trans>Nothing past due</Trans>
              </Detail>
            </>
          ) : (
            <>
              <Headline className="text-destructive">
                <Icon icon={CircleAlert} size={18} className="shrink-0" aria-hidden />
                {money(s.pastDue, currency)}
              </Headline>
              <Detail>
                {s.pastDueCount === 1 ? (
                  <Trans>1 invoice · {s.maxDaysOverdue} days overdue</Trans>
                ) : (
                  <Trans>
                    {s.pastDueCount} invoices · oldest {s.maxDaysOverdue} days overdue
                  </Trans>
                )}
              </Detail>
            </>
          )
        }
      />
    </Tile>
  );
}

function LifetimePaidTile(props: HealthCardsProps) {
  const currency = accountCurrency(props.account);
  return (
    <Tile title={<Trans>Lifetime paid</Trans>}>
      <InvoiceTileBody
        {...props}
        render={(s, more) => (
          <>
            <Headline>
              {money(s.lifetimePaid, currency)}
              {more}
            </Headline>
            <Detail>
              {s.paidCount === 1 ? (
                <Trans>1 paid invoice</Trans>
              ) : (
                <Trans>{s.paidCount} paid invoices</Trans>
              )}
            </Detail>
          </>
        )}
      />
    </Tile>
  );
}

function UsageTrend({ comparison }: { comparison: UsageSpendComparison }) {
  const { current, previous } = comparison;
  if (previous <= 0) {
    return (
      <Detail>
        <Trans>No spend last cycle at this point</Trans>
      </Detail>
    );
  }
  const factor = current / previous;
  if (factor >= USAGE_SPIKE_FACTOR) {
    const times = Math.round(factor);
    return (
      <Detail className="text-warning flex items-center gap-1">
        <Icon icon={ArrowUp} size={12} className="shrink-0" aria-hidden />
        <Trans>{times}× last cycle at this point</Trans>
      </Detail>
    );
  }
  const percent = Math.round(Math.abs(factor - 1) * 100);
  if (percent === 0) {
    return (
      <Detail>
        <Trans>Same as last cycle at this point</Trans>
      </Detail>
    );
  }
  return (
    <Detail className="flex items-center gap-1">
      <Icon icon={factor > 1 ? ArrowUp : ArrowDown} size={12} className="shrink-0" aria-hidden />
      <Trans>{percent}% vs last cycle at this point</Trans>
    </Detail>
  );
}

function UsageTile({ orgName, account, now }: HealthCardsProps) {
  const { current, comparison, isLoading, isError } = useAccountUsageSpend(orgName, account, now);

  return (
    <Tile title={<Trans>Usage this cycle</Trans>}>
      {isLoading ? (
        <TileSkeleton />
      ) : isError || !current ? (
        <TileMessage>
          <Trans>Couldn&apos;t load usage.</Trans>
        </TileMessage>
      ) : current.usage.status !== 'ok' || current.usage.spendError ? (
        <>
          <Headline>—</Headline>
          <Detail>
            <Trans>Spend isn&apos;t available</Trans>
          </Detail>
        </>
      ) : (
        <>
          <Headline>
            {formatCurrency(
              current.usage.spend ?? { amount: 0, currency: accountCurrency(account) }
            )}
          </Headline>
          {comparison ? <UsageTrend comparison={comparison} /> : null}
        </>
      )}
    </Tile>
  );
}

/** Dates come from the account's payment terms, so there's nothing to load. */
function NextInvoiceTile({ account, now }: HealthCardsProps) {
  const next = useMemo(() => getNextInvoice(account, now), [account, now]);
  const frequency = frequencyLabel(next.frequency);

  return (
    <Tile title={<Trans>Next invoice</Trans>}>
      <Headline>
        <DateTime date={next.issuedAt} variant="absolute" format="MMM d, yyyy" tooltip={false} />
      </Headline>
      <Detail>
        {next.dueAt ? (
          <Trans>
            {frequency} · due{' '}
            <DateTime date={next.dueAt} variant="absolute" format="MMM d" tooltip={false} /> (net{' '}
            {next.netDays})
          </Trans>
        ) : (
          frequency
        )}
      </Detail>
    </Tile>
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
