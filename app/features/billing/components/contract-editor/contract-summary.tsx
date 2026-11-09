import {
  CONTRACT_CURRENCY,
  contractStartFromDate,
  feeTotal,
  firstInvoiceTotal,
  firstMonthShare,
  monthlyTotal,
  parseAmount,
  proratedFirstInvoiceTotal,
  startOfUtcDay,
} from '../../lib/contract';
import { listFeeRowAmount, type ListFeeOption } from '../../lib/contract-list-fees';
import { formatMoney } from '../../utils';
import { InlineDate } from '../billing-account-dashboard/card-parts';
import {
  fromListFeeRowValues,
  type ContractFeeRow,
  type ListFeeRowValues,
  type UsageRowValues,
} from './schema';
import { Form } from '@datum-cloud/datum-ui/form';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Plural, Trans } from '@lingui/react/macro';
import type { ReactNode } from 'react';

type SummaryFee = {
  key: string;
  label: string;
  chargeType: 'OneTime' | 'Recurring';
  amount: number;
  quantity: number;
};

/**
 * What the contract bills, worked out from the form as it's filled: each
 * fee, the usage, and the first invoice. `children` are the form's buttons.
 */
export function ContractSummary({
  isSetup,
  feeOptions,
  children,
}: {
  isSetup: boolean;
  feeOptions: ListFeeOption[];
  children: ReactNode;
}) {
  const rows = (Form.useWatch('fees') as ContractFeeRow[] | undefined) ?? [];
  const listRows = (Form.useWatch('listFees') as ListFeeRowValues[] | undefined) ?? [];
  const usageRows = (Form.useWatch('usage') as UsageRowValues[] | undefined) ?? [];
  const picked = Form.useWatch('startsAt') as Date | undefined;

  const fees: SummaryFee[] = [
    ...rows.map((row, index) => ({
      key: `own-${index}`,
      label: row.label.trim(),
      chargeType: row.chargeType,
      amount: parseAmount(row.amount),
      quantity: Number.parseInt(row.quantity, 10) || 1,
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
        },
      ];
    }),
  ];
  const meters = usageRows.filter((row) => row.selected);
  const customMeters = meters.filter((row) => row.amounts.some((a) => a.trim() !== '')).length;

  const priced = fees.filter((fee) => fee.amount > 0);
  const hasOneTime = priced.some((fee) => fee.chargeType === 'OneTime');
  const perMonth = formatMoney(monthlyTotal(priced), CONTRACT_CURRENCY);
  const startsAt = picked ? contractStartFromDate(picked) : null;
  // Set up on its start day, the account moves onto the contract when it's
  // saved, so the first month is prorated from then.
  const now = new Date();
  const startsToday = isSetup && startsAt?.getTime() === startOfUtcDay(now).getTime();
  const share = startsAt && startsToday ? firstMonthShare(startsAt, now) : 1;
  const prorated = share < 1 && monthlyTotal(priced) > 0;
  const total = formatMoney(
    prorated ? proratedFirstInvoiceTotal(priced, share) : firstInvoiceTotal(priced),
    CONTRACT_CURRENCY
  );
  const firstMonth = formatMoney(
    proratedFirstInvoiceTotal(
      priced.filter((fee) => fee.chargeType === 'Recurring'),
      share
    ),
    CONTRACT_CURRENCY
  );

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
                  <Text size="sm" className="shrink-0 tabular-nums">
                    {fee.chargeType === 'OneTime' ? (
                      <Trans>{amount} once</Trans>
                    ) : (
                      <Trans>{amount} / month</Trans>
                    )}
                  </Text>
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
          <Text as="p" size="sm" weight="medium">
            {startsToday ? (
              <Trans>
                First invoice today: about {total}, then {perMonth} a month.
              </Trans>
            ) : isSetup && startsAt ? (
              <Trans>
                First invoice on{' '}
                <InlineDate date={startsAt.toISOString()} variant="absolute" format="MMM d, yyyy" />
                : {total}, then {perMonth} a month.
              </Trans>
            ) : isSetup || hasOneTime ? (
              <Trans>
                First invoice: {total}, then {perMonth} a month.
              </Trans>
            ) : (
              <Trans>{perMonth} a month from the next billing date.</Trans>
            )}
          </Text>
          {prorated ? (
            <Text as="p" size="xs" textColor="warning">
              <Trans>
                Starting today, the first month is charged from when you save, so it&apos;s
                prorated: about {firstMonth} of {perMonth}. Start tomorrow for a full first month.
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

      {children}
    </div>
  );
}
