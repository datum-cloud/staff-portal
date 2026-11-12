import type { FeeBillingTiming, FeeInterval } from '../lib/contract';
import type { RateSlotLabel } from '../lib/contract-usage';
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

/** What a rate amount prices, in words, e.g. "runtime_class general-purpose, up to 100". */
export const rateSlotText = (label: RateSlotLabel) => {
  const parts: string[] = [];
  if (label.match) parts.push(`${label.match.dimension} ${label.match.value}`);
  else if (label.rest) parts.push(t`everything else`);
  if (label.band === 'all') {
    parts.push(t`all usage`);
  } else if (label.band && 'upTo' in label.band) {
    const upTo = label.band.upTo;
    parts.push(t`up to ${upTo}`);
  } else if (label.band) {
    const over = label.band.over;
    parts.push(t`over ${over}`);
  }
  return parts.length > 0 ? parts.join(', ') : t`per unit`;
};

/** How long a fee with renewals runs, e.g. "for 36 months" or "for 1 year". */
export const periodsText = (periods: number, interval: FeeInterval | undefined): string => {
  switch (interval) {
    case 'quarterly':
      return periods === 1 ? t`for 1 quarter` : t`for ${periods} quarters`;
    case 'annual':
      return periods === 1 ? t`for 1 year` : t`for ${periods} years`;
    default:
      return periods === 1 ? t`for 1 month` : t`for ${periods} months`;
  }
};

/** What a fee's renewals count, shown after the number: "months", "quarters" or "years". */
export const periodUnitText = (interval: FeeInterval | undefined): string =>
  interval === 'quarterly' ? t`quarters` : interval === 'annual' ? t`years` : t`months`;

/**
 * The fees on an invoice in a few words, however many there are: "Private
 * link", "Private link and Cross connect", or "Private link, Cross connect
 * and 3 more" past `shown` of them.
 */
export const chargeNamesText = (names: string[], shown = 2): string => {
  if (names.length === 1) return names[0];
  if (names.length === 2) return t`${names[0]} and ${names[1]}`;
  if (names.length <= shown) return names.join(', ');
  const first = names.slice(0, shown).join(', ');
  const more = names.length - shown;
  return t`${first} and ${more} more`;
};
