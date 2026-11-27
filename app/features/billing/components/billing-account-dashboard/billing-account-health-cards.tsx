import { useAccountInvoices, useAccountUsageSpend } from '../../hooks';
import { isUsageSpike, type UsageSpendComparison } from '../../lib/account-health';
import {
  contractInvoiceDay,
  discountedFeeTotal,
  getContractFees,
  offerBillsUsage,
  recurringTotals,
  type ContractState,
} from '../../lib/contract';
import { contractInvoiceSchedule, upcomingInvoices } from '../../lib/contract-schedule';
import { getNextInvoice, summarizeInvoices, type InvoiceSummary } from '../../lib/invoice-summary';
import { getBillingMode } from '../../lib/payment-terms';
import {
  formatMoney,
  getAccountCurrency,
  getEffectiveNetDays,
  type BillingAccount,
} from '../../utils';
import { recurringTotalsText } from '../contract-fee-text';
import { frequencyLabel, InlineDate } from './card-parts';
import {
  StatTile,
  StatTileDetail,
  StatTileHeadline,
  StatTileMessage,
  StatTileSkeleton,
} from '@/components/stat-tile';
import { DiscountedSpend } from '@/features/organization/usage/components/discounted-spend';
import {
  useBillingEntitlementForAccountQuery,
  useOfferDetailQuery,
} from '@/resources/request/client';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

interface HealthCardsProps {
  orgName: string;
  account: BillingAccount;
  now: Date;
  /** The account's contract, which sets when it's invoiced, if it has one. */
  contract?: ContractState | null;
  /** The account's plan doesn't bill usage, so there's no usage to show. */
  usageNotBilled?: boolean;
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
  const { invoices, hasMore, isLoading, isError } = useAccountInvoices(orgName, account);
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
      render={(s, more) => {
        const unpaid = (
          <Plural value={s.unpaidCount} one="# unpaid invoice" other="# unpaid invoices" />
        );
        const pastDue = formatMoney(s.pastDue, currency);
        const overdue = <PastDueDetail count={s.pastDueCount} days={s.maxDaysOverdue} />;
        return (
          <>
            <StatTileHeadline>{`${formatMoney(s.outstanding, currency)}${more}`}</StatTileHeadline>
            <StatTileDetail>
              {s.unpaidCount === 0 ? (
                <Trans>Nothing owed</Trans>
              ) : s.pastDueCount === 0 ? (
                <Trans>{unpaid} · nothing past due</Trans>
              ) : (
                unpaid
              )}
            </StatTileDetail>
            {s.pastDueCount > 0 ? (
              <StatTileDetail className="text-destructive flex items-center gap-1">
                <Icon icon={STATUS_ICONS.alert} size={12} className="shrink-0" aria-hidden />
                <span>
                  <Trans>
                    {pastDue} past due · {overdue}
                  </Trans>
                </span>
              </StatTileDetail>
            ) : null}
          </>
        );
      }}
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

/**
 * What the contract's recurring fees come to each period, after discounts
 * and before tax. Shown in place of usage for a contract that bills none.
 */
function ContractValueTile({ orgName, account, contract }: HealthCardsProps) {
  const accountName = account.metadata?.name ?? '';
  const entitlementQuery = useBillingEntitlementForAccountQuery(orgName, accountName);
  const offerQuery = useOfferDetailQuery(
    contract ? (entitlementQuery.data?.spec?.offerRef?.name ?? '') : ''
  );
  const currency = getAccountCurrency(account);
  const totals = useMemo(
    () =>
      recurringTotals(
        getContractFees(offerQuery.data).map((fee) => ({
          ...fee,
          amount: discountedFeeTotal(fee),
          quantity: 1,
        }))
      ),
    [offerQuery.data]
  );
  const recurring = recurringTotalsText({
    monthly: totals.monthly > 0 ? formatMoney(totals.monthly, currency) : undefined,
    quarterly: totals.quarterly > 0 ? formatMoney(totals.quarterly, currency) : undefined,
    annual: totals.annual > 0 ? formatMoney(totals.annual, currency) : undefined,
  });
  return (
    <StatTile title={<Trans>Contract value</Trans>}>
      {offerQuery.isLoading || entitlementQuery.isLoading ? (
        <StatTileSkeleton />
      ) : !offerQuery.data ? (
        <StatTileMessage>
          <Trans>Couldn&apos;t load the contract.</Trans>
        </StatTileMessage>
      ) : (
        <>
          <StatTileHeadline>{recurring || formatMoney(0, currency)}</StatTileHeadline>
          <StatTileDetail>
            <Trans>Recurring fees · usage isn&apos;t billed</Trans>
          </StatTileDetail>
        </>
      )}
    </StatTile>
  );
}

function UsageTrend({ comparison }: { comparison: UsageSpendComparison }) {
  const { current, previous } = comparison;
  if (previous <= 0) {
    return (
      <StatTileDetail>
        <Trans>No spend at this point last cycle</Trans>
      </StatTileDetail>
    );
  }
  const factor = current / previous;
  if (isUsageSpike(comparison)) {
    const times = Math.round(factor);
    return (
      <StatTileDetail className="text-warning flex items-center gap-1">
        <Icon icon={ArrowUp} size={12} className="shrink-0" aria-hidden />
        <Trans>{times}× this point last cycle</Trans>
      </StatTileDetail>
    );
  }
  const percent = Math.round(Math.abs(factor - 1) * 100);
  if (percent === 0) {
    return (
      <StatTileDetail>
        <Trans>Same as this point last cycle</Trans>
      </StatTileDetail>
    );
  }
  return (
    <StatTileDetail className="flex items-center gap-1">
      <Icon icon={factor > 1 ? ArrowUp : ArrowDown} size={12} className="shrink-0" aria-hidden />
      <Trans>{percent}% vs this point last cycle</Trans>
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
            <DiscountedSpend
              beforeClassName="text-sm font-normal"
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

/**
 * Dates come from the account's payment terms, or its contract's billing
 * day, so there's nothing to load beyond the entitlement.
 */
function NextInvoiceTile({ orgName, account, now, contract }: HealthCardsProps) {
  const next = useMemo(() => getNextInvoice(account, now, contract), [account, now, contract]);
  // A contract's first invoice goes out the day it starts, then monthly.
  const frequency = next.contractStart ? t`Contract starts` : frequencyLabel(next.frequency);
  // Net days only mean something on payment terms: a card account is
  // charged when it's invoiced, whatever spec.paymentTerms says.
  const byCard = getBillingMode(account) === 'card';
  const fixed = useContractNextInvoiceTotal(orgName, account, now, contract);
  const issued = (
    <InlineDate date={next.issuedAt} variant="absolute" format="MMM d, yyyy" timezone="UTC" />
  );

  return (
    <StatTile title={<Trans>Next invoice</Trans>}>
      {/* A contract's fixed fees are known ahead, so they lead; otherwise
          the date does, since billing doesn't estimate usage. */}
      <StatTileHeadline>{fixed ? fixed.total : issued}</StatTileHeadline>
      {fixed ? (
        <StatTileDetail>
          {fixed.billsUsage ? <Trans>{issued} · plus usage</Trans> : issued}
        </StatTileDetail>
      ) : null}
      <StatTileDetail>
        {byCard ? (
          <Trans>{frequency} · charged to the card</Trans>
        ) : next.dueAt ? (
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

/**
 * The fixed fees on a contract's next invoice, as the contract card's
 * schedule works them out: before tax, discounts and any usage. Nothing for
 * an account without a contract, or a contract with no fee on that invoice:
 * billing doesn't estimate usage.
 */
function useContractNextInvoiceTotal(
  orgName: string,
  account: BillingAccount,
  now: Date,
  contract?: ContractState | null
): { total: string; billsUsage: boolean } | null {
  const accountName = account.metadata?.name ?? '';
  const entitlementQuery = useBillingEntitlementForAccountQuery(orgName, accountName);
  const offerName = contract ? (entitlementQuery.data?.spec?.offerRef?.name ?? '') : '';
  const offerQuery = useOfferDetailQuery(offerName);
  return useMemo(() => {
    if (!contract || !offerQuery.data) return null;
    const [first] = upcomingInvoices(
      contractInvoiceSchedule({
        startsAt: contract.startsAt,
        fees: getContractFees(offerQuery.data),
        billsUsage: offerBillsUsage(offerQuery.data),
        netDays: getEffectiveNetDays(account),
        invoiceDay: contractInvoiceDay(contract.billingDay, account.spec?.paymentTerms),
      }),
      now
    );
    if (!first || first.total <= 0) return null;
    return {
      total: formatMoney(first.total, getAccountCurrency(account)),
      billsUsage: first.billsUsage,
    };
  }, [contract, offerQuery.data, account, now]);
}

/**
 * The dashboard's headline numbers: what's owed, the next invoice, and
 * this cycle's usage, or the contract's value when it bills no usage. Each
 * tile loads and fails on its own.
 */
export function BillingAccountHealthCards(props: HealthCardsProps) {
  return (
    <section
      aria-label={t`Account summary`}
      // Wide, the last tile is as wide as the page's side column, so the
      // tiles' edges meet the cards' below them.
      className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3 @5xl/main:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_400px]">
      <OutstandingTile {...props} />
      <NextInvoiceTile {...props} />
      {props.usageNotBilled ? <ContractValueTile {...props} /> : <UsageTile {...props} />}
    </section>
  );
}
