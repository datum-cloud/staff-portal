import {
  CONTRACT_CURRENCY,
  contractStartFromDate,
  feeTotal,
  firstInvoiceTotal,
  hasFeesInArrears,
  MAX_CONTRACT_FEES,
  parseDiscount,
  parsePeriods,
  feeEndsAt,
  parseAmount,
  proratedFirstInvoiceTotal,
  recurringTotals,
  startOfUtcDay,
  type FeeBillingTiming,
  type FeeInterval,
} from '../../lib/contract';
import { listFeeRowAmount, type ListFeeOption } from '../../lib/contract-list-fees';
import { contractInvoiceSchedule, upcomingInvoices } from '../../lib/contract-schedule';
import { formatMoney } from '../../utils';
import { InlineDate } from '../billing-account-dashboard/card-parts';
import {
  billingTimingText,
  feeChargeText,
  periodsText,
  recurringTotalsText,
} from '../contract-fee-text';
import { ContractScheduleList } from '../contract-schedule-list';
import {
  fromListFeeRowValues,
  type ContractFeeRow,
  type ContractFormValues,
  type ListFeeRowValues,
  type UsageRowValues,
} from './schema';
import { Form } from '@datum-cloud/datum-ui/form';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { useFormState, type UseFormReturn } from 'react-hook-form';

type SummaryFee = {
  key: string;
  label: string;
  chargeType: 'OneTime' | 'Recurring';
  amount: number;
  quantity: number;
  interval?: FeeInterval;
  billingTiming?: FeeBillingTiming;
  discount?: number;
  periods?: number;
};

/**
 * What the contract bills, worked out from the form as it's filled: each
 * fee, the usage, and the first invoice. `children` are the form's buttons.
 */
export function ContractSummary({
  isSetup,
  feeOptions,
  contractStartsAt,
  netDays,
  children,
}: {
  isSetup: boolean;
  feeOptions: ListFeeOption[];
  /** The contract's start, for a change to one; a new contract's is picked. */
  contractStartsAt?: Date;
  /** The account's payment terms, for when invoices are due. */
  netDays?: number;
  children: ReactNode;
}) {
  const rows = (Form.useWatch('fees') as ContractFeeRow[] | undefined) ?? [];
  const listRows = (Form.useWatch('listFees') as ListFeeRowValues[] | undefined) ?? [];
  const usageRows = (Form.useWatch('usage') as UsageRowValues[] | undefined) ?? [];
  const picked = Form.useWatch('startsAt') as Date | undefined;
  // The contract's fees as a whole: none at all, or too many. Worked out
  // from the form as it is, since the form only re-checks the rule when the
  // contract's own fees change, not when the price list's are ticked, and
  // shown once a save has been tried.
  const form = Form.useFormContext().form.raw as UseFormReturn<ContractFormValues>;
  const { isSubmitted } = useFormState({ control: form.control });
  const feeCount = rows.length + listRows.filter((row) => row.selected).length;
  const feesError = !isSubmitted
    ? null
    : feeCount === 0 && !usageRows.some((row) => row.selected)
      ? t`Add a fee, or tick something on the price list.`
      : feeCount > MAX_CONTRACT_FEES
        ? t`A contract can have at most ${MAX_CONTRACT_FEES} fees, counting those from the price list.`
        : null;

  const fees: SummaryFee[] = [
    ...rows.map((row, index) => ({
      key: `own-${index}`,
      label: row.label.trim(),
      chargeType: row.chargeType,
      amount: parseAmount(row.amount),
      quantity: Number.parseInt(row.quantity, 10) || 1,
      ...(row.chargeType === 'Recurring'
        ? {
            interval: row.interval,
            billingTiming: row.billingTiming,
            periods: parsePeriods(row.periods),
          }
        : {}),
    })),
    ...listRows.flatMap((row, index): SummaryFee[] => {
      const option = feeOptions[index];
      if (!row.selected || !option) return [];
      return [
        {
          key: `list-${option.name}`,
          label: option.label,
          chargeType: option.chargeType,
          amount: listFeeRowAmount(fromListFeeRowValues(row), option),
          quantity: Number.parseInt(row.quantity, 10) || 1,
          discount: parseDiscount(row.discount),
          ...(option.chargeType === 'Recurring'
            ? {
                interval: option.interval,
                billingTiming: row.billingTiming,
                periods: parsePeriods(row.periods),
              }
            : {}),
        },
      ];
    }),
  ];
  const meters = usageRows.filter((row) => row.selected);
  const customMeters = meters.filter((row) => row.amounts.some((a) => a.trim() !== '')).length;

  const priced = fees.filter((fee) => fee.amount > 0);
  const hasOneTime = priced.some((fee) => fee.chargeType === 'OneTime');
  const totals = recurringTotals(priced);
  const recurring = recurringTotalsText({
    monthly: totals.monthly > 0 ? formatMoney(totals.monthly, CONTRACT_CURRENCY) : undefined,
    quarterly: totals.quarterly > 0 ? formatMoney(totals.quarterly, CONTRACT_CURRENCY) : undefined,
    annual: totals.annual > 0 ? formatMoney(totals.annual, CONTRACT_CURRENCY) : undefined,
  });
  const inArrears = hasFeesInArrears(priced);
  const startsAt = picked ? contractStartFromDate(picked) : null;
  // Set up on its start day, the account moves onto the contract when it's
  // saved, so fees billed in advance are prorated from then.
  const now = new Date();
  const startsToday = isSetup && startsAt?.getTime() === startOfUtcDay(now).getTime();
  const fullFirst = firstInvoiceTotal(priced);
  const firstInvoice =
    startsAt && startsToday ? proratedFirstInvoiceTotal(priced, startsAt, now) : fullFirst;
  const prorated = firstInvoice < fullFirst;
  const total = formatMoney(firstInvoice, CONTRACT_CURRENCY);
  const fullTotal = formatMoney(fullFirst, CONTRACT_CURRENCY);
  // A first invoice on the start date only when something's billed in advance.
  const showFirstInvoice = (isSetup || hasOneTime) && fullFirst > 0;

  // When the contract's charges will be invoiced: a new contract's from its
  // first invoice, a change's from today, as if it applied now.
  const scheduleStart = isSetup ? startsAt : contractStartsAt;
  const schedule = scheduleStart
    ? contractInvoiceSchedule({
        startsAt: scheduleStart,
        fees: priced.map((fee) => ({ ...fee, name: fee.key, label: fee.label || t`Unnamed fee` })),
        billsUsage: meters.length > 0,
        netDays,
      })
    : [];
  const upcoming = isSetup ? schedule : upcomingInvoices(schedule, now);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Text size="sm" weight="medium">
          <Trans>Fees</Trans>
        </Text>
        {priced.length === 0 ? (
          <Text size="sm" textColor="muted">
            <Trans>No fees yet.</Trans>
          </Text>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {priced.map((fee) => {
              const amount = formatMoney(feeTotal(fee), CONTRACT_CURRENCY);
              return (
                <li key={fee.key} className="flex items-baseline justify-between gap-3">
                  <Text size="sm" className="min-w-0 truncate">
                    {fee.label || <Trans>Unnamed fee</Trans>}
                    {fee.quantity > 1 ? ` × ${fee.quantity}` : ''}
                  </Text>
                  <div className="flex shrink-0 flex-col items-end">
                    <Text size="sm" className="tabular-nums">
                      {feeChargeText(amount, fee)}
                    </Text>
                    {fee.billingTiming ? (
                      <Text size="xs" textColor="muted">
                        {[
                          billingTimingText(fee.billingTiming),
                          fee.periods ? periodsText(fee.periods, fee.interval) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    ) : null}
                    {fee.periods && scheduleStart ? (
                      <Text size="xs" textColor="muted">
                        <Trans>
                          until{' '}
                          <InlineDate
                            date={feeEndsAt(scheduleStart, fee.interval, fee.periods).toISOString()}
                            variant="absolute"
                            format="MMM d, yyyy"
                          />
                        </Trans>
                      </Text>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Text size="sm" weight="medium">
          <Trans>Usage</Trans>
        </Text>
        <Text size="sm" textColor="muted">
          {meters.length === 0 ? (
            <Trans>Not billed.</Trans>
          ) : (
            <>
              <Plural value={meters.length} one="# meter billed" other="# meters billed" />
              {customMeters > 0 ? (
                <>
                  {', '}
                  <Plural
                    value={customMeters}
                    one="# at the customer's rates"
                    other="# at the customer's rates"
                  />
                </>
              ) : null}
              .
            </>
          )}
        </Text>
      </div>

      {priced.length > 0 ? (
        <div className="bg-muted/40 flex flex-col gap-1 rounded-md border px-3 py-2">
          {showFirstInvoice ? (
            <Text as="p" size="sm" weight="medium">
              {startsToday ? (
                <Trans>First invoice today: about {total}.</Trans>
              ) : isSetup && startsAt ? (
                <Trans>
                  First invoice on{' '}
                  <InlineDate
                    date={startsAt.toISOString()}
                    variant="absolute"
                    format="MMM d, yyyy"
                  />
                  : {total}.
                </Trans>
              ) : (
                <Trans>First invoice: {total}.</Trans>
              )}
            </Text>
          ) : null}
          {recurring ? (
            <Text as="p" size="sm" weight="medium">
              {showFirstInvoice ? (
                <Trans>Then {recurring}.</Trans>
              ) : isSetup ? (
                <Trans>{recurring}.</Trans>
              ) : (
                <Trans>{recurring} from the next billing date.</Trans>
              )}
            </Text>
          ) : null}
          {inArrears ? (
            <Text as="p" size="xs" textColor="muted">
              <Trans>
                Fees billed in arrears are invoiced at the end of each period, with that
                period&apos;s usage.
              </Trans>
            </Text>
          ) : null}
          {prorated ? (
            <Text as="p" size="xs" textColor="warning">
              <Trans>
                Starting today, fees billed in advance are charged from when you save, so their
                first period is prorated: about {total} rather than {fullTotal}. Start tomorrow for
                a full first period.
              </Trans>
            </Text>
          ) : null}
          <Text as="p" size="xs" textColor="muted">
            <Trans>
              Before discounts and tax, plus any usage. Check it with a preview once saved.
            </Trans>
          </Text>
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <div className="border-t pt-3">
          <ContractScheduleList upcoming={upcoming} />
        </div>
      ) : null}

      {feesError ? (
        <Text size="sm" textColor="destructive" role="alert">
          {feesError}
        </Text>
      ) : null}

      {children}
    </div>
  );
}
