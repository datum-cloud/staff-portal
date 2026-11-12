import type { FeeBillingTiming, FeeInterval } from '../lib/contract';
import { i18n } from '@lingui/core';
import { t } from '@lingui/core/macro';

/**
 * How contract fees read in the staff portal: what one charges and how
 * often, and when it's invoiced. Shared by the contract editor, its price
 * list and the account's contract and draft cards.
 */

/** A fee's amount and how often it's charged, e.g. "$300.00 / quarter" or "$1,500.00 once". */
export const feeChargeText = (
  amount: string,
  fee: { chargeType: 'OneTime' | 'Recurring'; interval?: FeeInterval }
): string => {
  if (fee.chargeType === 'OneTime') return t`${amount} once`;
  switch (fee.interval) {
    case 'quarterly':
      return t`${amount} / quarter`;
    case 'annual':
      return t`${amount} / year`;
    default:
      return t`${amount} / month`;
  }
};

/** When a recurring fee is invoiced, as a short phrase: "billed in advance". */
export const billingTimingText = (timing: FeeBillingTiming): string =>
  timing === 'InArrears' ? t`billed in arrears` : t`billed in advance`;

/**
 * What recurring fees charge each period, e.g. "$1,000.00 a month and
 * $600.00 a year", from totals already formatted. Intervals with nothing to
 * charge are left out; empty when none has.
 */
export const recurringTotalsText = (totals: Partial<Record<FeeInterval, string>>): string => {
  const parts = [
    totals.monthly ? t`${totals.monthly} a month` : null,
    totals.quarterly ? t`${totals.quarterly} a quarter` : null,
    totals.annual ? t`${totals.annual} a year` : null,
  ].filter((part): part is string => Boolean(part));
  return new Intl.ListFormat(i18n.locale || undefined, { type: 'conjunction' }).format(parts);
};
