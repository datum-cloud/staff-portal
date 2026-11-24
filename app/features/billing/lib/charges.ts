import {
  formatMoney,
  getBillingAccountDisplayName,
  getEffectiveNetDays,
  type PaymentMethod,
} from '../utils';
import { accountInvoiceDay, startOfUtcDay } from './contract';
import { feeOptionFromPricing, listFeeOptions, type ListFeeOption } from './contract-list-fees';
import { i18n } from '@lingui/core';
import { t } from '@lingui/core/macro';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1Charge,
  ComMiloapisBillingV1Alpha1ChargeDraft,
  ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';

/**
 * Charges staff add to a billing account: a catalog item or a custom one,
 * billed once on the account's next invoice or straight away. See
 * milo-os/billing docs/enhancements/staff-charges.md.
 */

export type Charge = ComMiloapisBillingV1Alpha1Charge;
export type ChargeSpec = Charge['spec'];
/** Charges staff saved to check and send later: several lines, still editable. */
export type ChargeDraft = ComMiloapisBillingV1Alpha1ChargeDraft;
export type ChargeDraftSpec = ChargeDraft['spec'];
export type ChargeDraftLine = ChargeDraftSpec['lines'][number];
type BillingAccount = ComMiloapisBillingV1Alpha1BillingAccount;
type ServicePricing = ComMiloapisBillingV1Alpha1ServicePricing;

/**
 * Set by openmeter-provider once the account's invoices are written by the
 * invoice writer. Billing refuses charges on any other account.
 */
export const INVOICE_WRITER_READY_CONDITION = 'InvoiceWriterReady';

/** Whether the account takes charges: its InvoiceWriterReady condition is True. */
export const isInvoiceWriterReady = (account: BillingAccount): boolean =>
  account.status?.conditions?.some(
    (condition) => condition.type === INVOICE_WRITER_READY_CONDITION && condition.status === 'True'
  ) ?? false;

/** Labels the pricing custom charges bill as, which the item picker leaves out. */
export const CHARGE_PURPOSE_LABEL = 'billing.miloapis.com/purpose';
export const CUSTOM_CHARGE_PURPOSE = 'custom-charge';

export const MAX_CHARGE_DESCRIPTION = 256;
export const MAX_CHARGE_NOTE = 500;

// ─── Amounts ─────────────────────────────────────────────────────────────────

/**
 * Digits with up to two decimal places after a dot. Commas are only allowed
 * between groups of three digits ("1,250.00"), so a decimal comma ("1,50",
 * as typed in French) is refused rather than read as 150.
 */
const DECIMAL_PATTERN = /^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/;

/**
 * A decimal with up to two places ("2", "3.5", "1,250.00") in hundredths,
 * so amounts are worked out exactly; null when it isn't one.
 */
export const parseHundredths = (value: string | undefined): bigint | null => {
  const trimmed = (value ?? '').trim();
  if (!DECIMAL_PATTERN.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.replace(/,/g, '').split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
};

/** Hundredths as a decimal with exactly two places, e.g. 45000n → "450.00". */
export const centsText = (cents: bigint): string =>
  `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;

/** Hundredths as the shortest decimal, e.g. 350n → "3.5", 200n → "2". */
export const hundredthsText = (value: bigint): string =>
  centsText(value).replace(/\.?0+$/, '') || '0';

/**
 * An amount in cents as money, as the rest of the billing pages show it,
 * e.g. "$1,250.00". The sums stay in cents; this is only for display.
 */
export const formatChargeMoney = (cents: bigint): string => formatMoney(Number(cents) / 100, 'USD');

/** A decimal amount string from the API as money, or as it is when it isn't whole cents. */
export const formatChargeAmount = (amount: string | undefined): string => {
  const cents = parseHundredths(amount);
  return cents === null ? (amount ? `${amount} USD` : '—') : formatChargeMoney(cents);
};

export type ChargeAmounts =
  | { ok: true; amount: bigint; discount: bigint; amountDue: bigint }
  | { ok: false; problem: 'quantity' | 'unitAmount' | 'discountPercent' | 'amount' | 'discount' };

/**
 * What a charge comes to, in cents, as billing works it out: quantity ×
 * unit price, less the discount. Both must be whole cents, since Stripe's
 * rounding is never allowed to change an amount; billing refuses a charge
 * that doesn't divide rather than round it.
 */
export const chargeAmounts = (
  quantity: string,
  unitAmount: string,
  discountPercent = ''
): ChargeAmounts => {
  const qty = parseHundredths(quantity);
  if (qty === null || qty <= 0n) return { ok: false, problem: 'quantity' };
  const unit = parseHundredths(unitAmount);
  if (unit === null) return { ok: false, problem: 'unitAmount' };
  // Hundredths × cents is ten-thousandths of a dollar: whole cents when it
  // divides by 100.
  const product = qty * unit;
  if (product % 100n !== 0n) return { ok: false, problem: 'amount' };
  const amount = product / 100n;
  if (!discountPercent.trim()) return { ok: true, amount, discount: 0n, amountDue: amount };
  const pct = parseHundredths(discountPercent);
  if (pct === null || pct <= 0n || pct > 10000n) return { ok: false, problem: 'discountPercent' };
  // Cents × hundredths of a percent is a ten-thousandth of a cent.
  const off = amount * pct;
  if (off % 10000n !== 0n) return { ok: false, problem: 'discount' };
  const discount = off / 10000n;
  return { ok: true, amount, discount, amountDue: amount - discount };
};

// ─── Dates ───────────────────────────────────────────────────────────────────

export interface ServicePeriod {
  /** The first day, YYYY-MM-DD, UTC. */
  start: string;
  /** The last day, YYYY-MM-DD, UTC, included. */
  end: string;
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A UTC midnight as YYYY-MM-DD. */
export const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/** YYYY-MM-DD as its UTC midnight, or undefined when it isn't a real date. */
export const parseIsoDay = (day: string | undefined): Date | undefined => {
  if (!day || !DAY_PATTERN.test(day)) return undefined;
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || isoDay(date) !== day ? undefined : date;
};

/** `days` days after a UTC day. */
export const addDays = (day: string, days: number): string => {
  const date = parseIsoDay(day);
  return date ? isoDay(new Date(date.getTime() + days * DAY_MS)) : day;
};

/**
 * The calendar day a date picker's local date stands for, as YYYY-MM-DD:
 * pickers work in the browser's zone, and a charge's dates are UTC days.
 */
export const isoDayFromLocalDate = (date: Date): string =>
  isoDay(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));

/** A UTC day as the local date a date picker shows for it. */
export const localDateFromIsoDay = (day: string | undefined): Date | null => {
  const date = parseIsoDay(day);
  return date ? new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) : null;
};

/**
 * A date (YYYY-MM-DD or a timestamp) as its UTC day, in the invoices card's
 * format, e.g. "Dec 15, 2026". Charge dates are UTC days, so the browser's
 * zone never moves them.
 */
export const formatUtcDay = (value: string | undefined): string => {
  if (!value) return '—';
  const date = DAY_PATTERN.test(value) ? parseIsoDay(value) : new Date(value);
  if (!date || Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(i18n.locale || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

/** A service period, e.g. "Dec 15, 2026", or "Dec 1, 2026 – Dec 31, 2026". */
export const formatServicePeriod = (period: Partial<ServicePeriod> | undefined): string => {
  if (!period?.start) return '—';
  if (!period.end || period.end === period.start) return formatUtcDay(period.start);
  return `${formatUtcDay(period.start)} – ${formatUtcDay(period.end)}`;
};

/** The day of the month in a month, or the month's last day when it's shorter. */
const billingDateIn = (year: number, month: number, day: number): Date => {
  const first = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
  ).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, lastDay)));
};

/**
 * The day of the month the account bills on, for a charge's default
 * service period: its contract's billing day once the contract has
 * started, else its payment terms' invoice day, else the 1st. As billing's
 * ChargeBillingDay.
 */
export const chargeBillingDay = (account: BillingAccount, now: Date): number => {
  const contract = account.status?.contract;
  if (contract && contract.billingDayOfMonth > 0 && new Date(contract.startsAt) <= now) {
    return contract.billingDayOfMonth;
  }
  return accountInvoiceDay(account.spec?.paymentTerms);
};

/**
 * The billing period `date`'s UTC day falls in, for an account billing on
 * `billingDay`: from the most recent billing day on or before it to the day
 * before the next. Months shorter than the billing day bill on their last
 * day.
 */
export const billingPeriodContaining = (billingDay: number, date: Date): ServicePeriod => {
  const today = startOfUtcDay(date);
  let start = billingDateIn(today.getUTCFullYear(), today.getUTCMonth(), billingDay);
  if (start > today) {
    start = billingDateIn(today.getUTCFullYear(), today.getUTCMonth() - 1, billingDay);
  }
  const next = billingDateIn(start.getUTCFullYear(), start.getUTCMonth() + 1, billingDay);
  return { start: isoDay(start), end: isoDay(new Date(next.getTime() - DAY_MS)) };
};

/**
 * The account's current billing period, which billing stores as a charge's
 * service period when staff leave it out.
 */
export const currentBillingPeriod = (account: BillingAccount, now: Date): ServicePeriod =>
  billingPeriodContaining(chargeBillingDay(account, now), now);

/** The billing period after the current one. */
export const nextBillingPeriod = (account: BillingAccount, now: Date): ServicePeriod => {
  const current = currentBillingPeriod(account, now);
  const nextStart = parseIsoDay(addDays(current.end, 1)) ?? now;
  return billingPeriodContaining(chargeBillingDay(account, now), nextStart);
};

/** Whether a supply date ends before the current billing period starts. */
export const isBeforePeriod = (end: string, current: ServicePeriod): boolean =>
  Boolean(parseIsoDay(end)) && end < current.start;

/** Bounds on a service period, as billing's: they catch typos in the year. */
export const CHARGE_PERIOD_MAX_YEARS_BACK = 2;
export const CHARGE_PERIOD_MAX_YEARS_AHEAD = 5;
export const CHARGE_PERIOD_MAX_YEARS_LONG = 5;

const addYears = (date: Date, years: number) => {
  const shifted = new Date(date.getTime());
  shifted.setUTCFullYear(shifted.getUTCFullYear() + years);
  return shifted;
};

export type ServicePeriodProblem =
  | { field: 'start' | 'end'; problem: 'missing' }
  | { field: 'end'; problem: 'before-start' | 'too-long' | 'too-far-ahead' }
  | { field: 'start'; problem: 'too-far-back' };

/**
 * What billing would refuse about a period's own dates, whenever they are:
 * missing, the end before the start, or longer than a charge's can be. A
 * contract fee's supply date is checked only for these, since billing
 * checks an Offer again long after its fees' dates.
 */
export const servicePeriodShapeProblems = (
  period: Partial<ServicePeriod>
): ServicePeriodProblem[] => {
  const start = parseIsoDay(period.start);
  const end = parseIsoDay(period.end);
  const problems: ServicePeriodProblem[] = [];
  if (!start) problems.push({ field: 'start', problem: 'missing' });
  if (!end) problems.push({ field: 'end', problem: 'missing' });
  if (!start || !end) return problems;
  if (end < start) problems.push({ field: 'end', problem: 'before-start' });
  else if (end > addYears(start, CHARGE_PERIOD_MAX_YEARS_LONG)) {
    problems.push({ field: 'end', problem: 'too-long' });
  }
  return problems;
};

/**
 * What billing would refuse about a charge's service period, as billing
 * checks it: its dates, and how far they are from today.
 */
export const servicePeriodProblems = (
  period: Partial<ServicePeriod>,
  now: Date
): ServicePeriodProblem[] => {
  const problems = servicePeriodShapeProblems(period);
  const start = parseIsoDay(period.start);
  const end = parseIsoDay(period.end);
  if (!start || !end) return problems;
  const today = startOfUtcDay(now);
  if (start < addYears(today, -CHARGE_PERIOD_MAX_YEARS_BACK)) {
    problems.push({ field: 'start', problem: 'too-far-back' });
  }
  if (end > addYears(today, CHARGE_PERIOD_MAX_YEARS_AHEAD)) {
    problems.push({ field: 'end', problem: 'too-far-ahead' });
  }
  return problems;
};

// ─── The form ────────────────────────────────────────────────────────────────

/** The item picker's value for a catalog item: this, then the pricing's name. */
export const CATALOG_ITEM_PREFIX = 'pricing:';

/** The catalog pricing an item value names, or undefined for a custom item. */
export const catalogPricingName = (item: string): string | undefined =>
  item.startsWith(CATALOG_ITEM_PREFIX) ? item.slice(CATALOG_ITEM_PREFIX.length) : undefined;

export type ChargeInvoiceTiming = NonNullable<ChargeSpec['invoice']>;

/** The add charge form's values, as typed. */
export interface ChargeFormValues {
  /**
   * The item: CATALOG_ITEM_PREFIX and a pricing's name, or a custom item's
   * name; empty until one is picked.
   */
  item: string;
  description: string;
  quantity: string;
  unitAmount: string;
  taxCode: string;
  notTaxable: boolean;
  discountPercent: string;
  /** Staff chose the supply date; unticked, billing stores the current billing period. */
  setPeriod: boolean;
  periodStart: string;
  periodEnd: string;
  note: string;
  invoice: ChargeInvoiceTiming;
}

export const emptyChargeFormValues = (): ChargeFormValues => ({
  item: '',
  description: '',
  quantity: '1',
  unitAmount: '',
  taxCode: '',
  notTaxable: false,
  discountPercent: '',
  setPeriod: false,
  periodStart: '',
  periodEnd: '',
  note: '',
  invoice: 'NextInvoice',
});

/** A decimal as typed, in the shortest form billing reads, or as typed when it isn't one. */
const decimalText = (value: string): string => {
  const parsed = parseHundredths(value);
  return parsed === null ? value.trim() : hundredthsText(parsed);
};

/** A price as typed, with two places, or as typed when it isn't one. */
const priceText = (value: string): string => {
  const parsed = parseHundredths(value);
  return parsed === null ? value.trim() : centsText(parsed);
};

/**
 * The Charge's spec from the form. A catalog item's description, price and
 * tax are sent as staff left them, so what's stored is what they saw; a
 * catalog item without a tax code is sent as taxable, so billing doesn't
 * fill in the pricing's code staff removed. An unticked supply date is
 * left out, for billing to store the account's current billing period.
 */
export const buildChargeSpec = (
  values: ChargeFormValues,
  accountName: string,
  invoiceGroup?: ChargeInvoiceGroup
): ChargeSpec => {
  const pricingName = catalogPricingName(values.item);
  const taxCode = values.taxCode.trim();
  const tax = values.notTaxable
    ? { taxable: false }
    : taxCode
      ? { code: taxCode }
      : pricingName
        ? { taxable: true }
        : undefined;
  const note = values.note.trim();
  const discountPercent = values.discountPercent.trim();
  return {
    billingAccountRef: { name: accountName },
    ...(pricingName ? { servicePricingRef: { name: pricingName, namespace: 'milo-system' } } : {}),
    description: values.description.trim(),
    quantity: decimalText(values.quantity),
    unitAmount: priceText(values.unitAmount),
    currency: 'USD',
    ...(tax ? { tax } : {}),
    ...(discountPercent ? { discountPercent: decimalText(discountPercent) } : {}),
    ...(values.setPeriod
      ? { servicePeriod: { start: values.periodStart, end: values.periodEnd } }
      : {}),
    ...(note ? { note } : {}),
    invoice: values.invoice,
    ...(invoiceGroup && values.invoice === 'Now' ? { invoiceGroup } : {}),
  };
};

export type ChargeInvoiceGroup = NonNullable<ChargeSpec['invoiceGroup']>;

/**
 * The invoice group for lines added together, or undefined when they don't
 * need one: a single line, or lines going on the next invoice, which they
 * join anyway. The name is picked once per dialog, so a retry joins the
 * same group.
 */
export const chargeInvoiceGroup = (
  invoice: ChargeInvoiceTiming,
  lines: number,
  name: string
): ChargeInvoiceGroup | undefined =>
  invoice === 'Now' && lines > 1 ? { name, size: lines } : undefined;

/** A name for an invoice group: "invoice-x7k2p". */
export const chargeInvoiceGroupName = (suffix: string = randomNameSuffix()): string =>
  `invoice-${suffix}`;

/**
 * A charge draft's spec from the dialog's lines: each line as its Charge
 * would be sent, without the account and timing the draft gives them all.
 */
export const buildChargeDraftSpec = (
  lines: ChargeFormValues[],
  invoice: ChargeInvoiceTiming,
  accountName: string
): ChargeDraftSpec => ({
  billingAccountRef: { name: accountName },
  invoice,
  lines: lines.map((values) => {
    const {
      billingAccountRef,
      invoice: _invoice,
      invoiceGroup,
      ...line
    } = buildChargeSpec({ ...values, invoice }, accountName);
    return line;
  }),
});

/** A draft's line as the add charge form holds it, to change or send. */
export const chargeFormValuesFromLine = (
  line: ChargeDraftLine,
  invoice: ChargeInvoiceTiming
): ChargeFormValues => ({
  item: line.servicePricingRef
    ? `${CATALOG_ITEM_PREFIX}${line.servicePricingRef.name}`
    : (line.description ?? ''),
  description: line.description ?? '',
  quantity: line.quantity,
  unitAmount: line.unitAmount ?? '',
  taxCode: line.tax?.taxable === false ? '' : (line.tax?.code ?? ''),
  notTaxable: line.tax?.taxable === false,
  discountPercent: line.discountPercent ?? '',
  setPeriod: Boolean(line.servicePeriod),
  periodStart: line.servicePeriod?.start ?? '',
  periodEnd: line.servicePeriod?.end ?? '',
  note: line.note ?? '',
  invoice,
});

/**
 * What a draft's lines come to before tax, from their quantities, prices
 * and discounts, or null while one of them isn't priced: a catalog line
 * left to its item's price is priced when it's sent.
 */
export const chargeDraftTotal = (draft: ChargeDraft): bigint | null => {
  let total = 0n;
  for (const line of draft.spec.lines) {
    if (!line.unitAmount) return null;
    const amounts = chargeAmounts(line.quantity, line.unitAmount, line.discountPercent);
    if (!amounts.ok) return null;
    total += amounts.amountDue;
  }
  return total;
};

/** Whether the add charge form holds nothing yet: no item, description or price. */
export const isEmptyChargeForm = (values: ChargeFormValues): boolean =>
  !values.item.trim() && !values.description.trim() && !values.unitAmount.trim();

/** The characters Kubernetes uses for generateName suffixes: no vowels, no look-alikes. */
const NAME_SUFFIX_ALPHABET = 'bcdfghjklmnpqrstvwxz2456789';

/** Five random characters, as Kubernetes adds to a generateName. */
export const randomNameSuffix = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (byte) => NAME_SUFFIX_ALPHABET[byte % NAME_SUFFIX_ALPHABET.length]).join(
    ''
  );
};

/**
 * A Charge's name, from a slug of its description and a random suffix:
 * "cross-connect-install-x7k2p". The add charge dialog picks it once and
 * sends the same name on every try, so a retry after a lost response finds
 * the charge already there instead of adding a second one.
 */
export const chargeName = (description: string, suffix: string = randomNameSuffix()): string => {
  const slug = description
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return `${slug || 'charge'}-${suffix}`;
};

/** The line as the customer reads it on the invoice: never the SKU, list price or note. */
export interface ChargeSummary {
  description: string;
  /** "2 × $250.00, less 10%", or empty until the quantity and price are numbers. */
  line: string;
  /** The amount after any discount, or empty until it can be worked out. */
  amount: string;
  /** The service period's dates. */
  dates: string;
}

/** What the invoice line will say, from the form and the account's current period. */
export const chargeSummary = (
  values: ChargeFormValues,
  currentPeriod: ServicePeriod
): ChargeSummary => {
  const qty = parseHundredths(values.quantity);
  const unit = parseHundredths(values.unitAmount);
  const base =
    qty !== null && unit !== null ? `${hundredthsText(qty)} × ${formatChargeMoney(unit)}` : '';
  const discount = values.discountPercent.trim();
  const amounts = chargeAmounts(values.quantity, values.unitAmount, values.discountPercent);
  const discountText = discount ? decimalText(discount) : '';
  return {
    description: values.description.trim(),
    line: base && discountText ? t`${base}, less ${discountText}%` : base,
    amount: amounts.ok ? formatChargeMoney(amounts.amountDue) : '',
    dates: formatServicePeriod(
      values.setPeriod ? { start: values.periodStart, end: values.periodEnd } : currentPeriod
    ),
  };
};

/** Stripe's smallest card charge in US dollars, in cents. */
export const STRIPE_MINIMUM_CHARGE_CENTS = 50n;

/**
 * What invoicing a charge now does, by how the account pays: an invoice it
 * pays on its terms, or the card on file, charged straight away. A $0.00
 * charge charges nothing; one under Stripe's minimum is carried to the next
 * invoice by Stripe; and an account with no card is left with an unpaid
 * invoice. `paymentMethods` is the account's, or undefined while they load.
 */
export const invoiceNowOutcome = (
  account: BillingAccount,
  amountDue: bigint,
  paymentMethods?: readonly PaymentMethod[]
): string => {
  const name = getBillingAccountDisplayName(account);
  const amount = formatChargeMoney(amountDue);
  if (account.status?.paymentArrangement?.type === 'Invoice') {
    const netDays = getEffectiveNetDays(account);
    return netDays !== undefined
      ? t`${name} is sent an invoice for ${amount} plus tax, due in ${netDays} days.`
      : t`${name} is sent an invoice for ${amount} plus tax.`;
  }
  if (amountDue === 0n) {
    return t`The invoice comes to ${amount}, so nothing is charged.`;
  }
  if (paymentMethods !== undefined && paymentMethods.length === 0) {
    return t`${name} has no card on file, so the invoice for ${amount} plus tax stays unpaid until one is added.`;
  }
  if (amountDue < STRIPE_MINIMUM_CHARGE_CENTS) {
    const minimum = formatChargeMoney(STRIPE_MINIMUM_CHARGE_CENTS);
    return t`If ${amount} plus tax is under Stripe's ${minimum} minimum, Stripe carries it to ${name}'s next invoice instead of charging the card.`;
  }
  return t`The card on file is charged ${amount} plus tax straight away.`;
};

// ─── The item picker ─────────────────────────────────────────────────────────

/** What the item picker offers: the account's own contract prices, then the catalog. */
export interface ChargeItemOptions {
  accountPrices: ListFeeOption[];
  catalog: ListFeeOption[];
}

/**
 * The pricings a charge can be for: one-time and recurring, never usage,
 * without the custom charge pricing. The account's contract fees come
 * first, since a customer price (basedOn) is only allowed on its own
 * account.
 */
export const chargeItemOptions = (
  pricings: ServicePricing[],
  account: BillingAccount
): ChargeItemOptions => {
  const offered = pricings.filter(
    (pricing) => pricing.metadata?.labels?.[CHARGE_PURPOSE_LABEL] !== CUSTOM_CHARGE_PURPOSE
  );
  const contractFees = new Set((account.status?.contract?.fees ?? []).map((fee) => fee.name));
  const accountPrices = offered
    .filter((pricing) => contractFees.has(pricing.metadata?.name ?? ''))
    .flatMap((pricing) => {
      const option = feeOptionFromPricing(pricing);
      return option ? [option] : [];
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const listed = new Set(accountPrices.map((option) => option.name));
  return {
    accountPrices,
    catalog: listFeeOptions(offered).filter((option) => !listed.has(option.name)),
  };
};

/** A pricing's amount as a price to charge: two places, or as it is when it has more. */
export const pricingUnitAmount = (amount: string): string => {
  const cents = parseHundredths(amount);
  return cents === null ? amount : centsText(cents);
};

// ─── Status ──────────────────────────────────────────────────────────────────

export type ChargeStatus =
  | { kind: 'next'; invoiceAt?: string; removableUntil?: string; onInvoice: boolean }
  | { kind: 'now' }
  | { kind: 'invoiced'; invoiceName: string }
  | { kind: 'waiting'; reason?: string; message?: string }
  | { kind: 'failed'; message?: string };

/** The condition the billing provider sets once a charge is on its invoice. */
export const CHARGE_ON_INVOICE_CONDITION = 'OnInvoice';

/**
 * Whether the billing provider has put the charge on its invoice, or has
 * started to. From then on billing refuses to remove it.
 */
export const isChargeOnInvoice = (charge: Charge): boolean =>
  charge.status?.conditions?.some(
    (condition) => condition.type === CHARGE_ON_INVOICE_CONDITION && condition.status === 'True'
  ) ?? false;

/** Where a charge is, from its phase and Ready condition. */
export const getChargeStatus = (charge: Charge): ChargeStatus => {
  const ready = charge.status?.conditions?.find((condition) => condition.type === 'Ready');
  switch (charge.status?.phase) {
    case 'Invoiced':
      return { kind: 'invoiced', invoiceName: charge.status.invoiceRef?.name ?? '' };
    case 'Failed':
      return { kind: 'failed', message: ready?.message || ready?.reason || undefined };
    case 'Scheduled':
      return charge.spec.invoice === 'Now'
        ? { kind: 'now' }
        : {
            kind: 'next',
            invoiceAt: charge.status.invoiceAt,
            removableUntil: charge.status.removableUntil,
            onInvoice: isChargeOnInvoice(charge),
          };
    default: {
      const waiting = ready && ready.status !== 'True';
      return {
        kind: 'waiting',
        reason: waiting ? ready.reason || undefined : undefined,
        message: waiting ? ready.message || undefined : undefined,
      };
    }
  }
};

/**
 * What a charge is waiting for, by its Ready condition's reason: billing
 * sets WaitingForProvider, and openmeter-provider the rest. Another reason
 * shows the condition's own message.
 */
const waitingText = (reason: string | undefined, message: string | undefined): string => {
  switch (reason) {
    case 'WaitingForProvider':
      return t`Waiting for the billing provider`;
    case 'WaitingForInvoiceWriter':
      return t`Waiting for the account to move to the invoice writer`;
    case 'WaitingForCustomer':
      return t`Waiting for the account's billing customer`;
    case 'WaitingForAmounts':
      return t`Waiting for billing to work out the amount`;
    case 'WaitingForInvoiceGroup':
      return t`Waiting for the other lines on its invoice`;
    default:
      return message || t`Waiting`;
  }
};

/** A charge's status in words, e.g. "Next invoice, Jan 1, 2027". */
export const chargeStatusText = (status: ChargeStatus): string => {
  switch (status.kind) {
    case 'next':
      if (!status.invoiceAt) return t`Next invoice`;
      return t`Next invoice, ${formatUtcDay(status.invoiceAt)}`;
    case 'now':
      return t`Invoicing now`;
    case 'invoiced':
      return status.invoiceName ? t`Invoiced on ${status.invoiceName}` : t`Invoiced`;
    case 'waiting':
      return waitingText(status.reason, status.message);
    case 'failed':
      return status.message ? t`Failed: ${status.message}` : t`Failed`;
  }
};

/** A UTC time as "Dec 31, 2026, 00:00 UTC". */
const formatUtcDayTime = (value: string): string =>
  `${formatUtcDay(value)}, ${new Date(value).toISOString().slice(11, 16)} UTC`;

/**
 * Whether staff can still remove a charge: until the billing provider puts
 * it on its invoice. A next-invoice charge is held in billing until shortly
 * before its invoice date, so it can be removed until then.
 */
export const isChargeRemovable = (charge: Charge): boolean =>
  charge.status?.phase !== 'Invoiced' && !isChargeOnInvoice(charge);

/** A short line under a charge's status, with more on hover. */
export interface ChargeRemovalNote {
  note: string;
  detail?: string;
}

/**
 * A line under a charge's status about removing it: until when a held
 * charge can be removed, or, once it's on its invoice, that it can't be,
 * with how to correct it on hover. Nothing for charges that are invoiced,
 * waiting or failed.
 */
export const chargeRemovalNote = (charge: Charge): ChargeRemovalNote | undefined => {
  if (charge.status?.phase !== 'Scheduled') return undefined;
  if (isChargeOnInvoice(charge)) {
    return {
      note: t`Can't be removed`,
      detail: t`It's on its invoice. Once the invoice is issued, correct it with a credit note.`,
    };
  }
  const until = charge.status.removableUntil;
  return until ? { note: t`Can be removed until ${formatUtcDayTime(until)}` } : undefined;
};

/**
 * What removing a charge does. Only charges that aren't on an invoice yet
 * can be removed, so nothing is billed: a held next-invoice charge, or one
 * that's waiting or failed.
 */
export const chargeRemovalText = (charge: Charge): string => {
  const name = charge.spec.description || charge.metadata?.name || t`The charge`;
  const status = getChargeStatus(charge);
  if (!isChargeRemovable(charge)) {
    return t`${name} is already on its invoice, so it can't be removed.`;
  }
  switch (status.kind) {
    case 'next':
      return status.removableUntil
        ? t`${name} is held until ${formatUtcDayTime(status.removableUntil)} and isn't on an invoice yet, so removing it bills nothing.`
        : t`${name} isn't on an invoice yet, so removing it bills nothing.`;
    case 'failed':
      return t`${name} didn't reach an invoice, so it won't be billed.`;
    default:
      return t`${name} isn't on an invoice yet, so it won't be billed.`;
  }
};

/** A charge's quantity and unit price, e.g. "2 × $250.00". */
export const chargeQuantityText = (spec: ChargeSpec): string =>
  `${decimalText(spec.quantity)} × ${formatChargeAmount(spec.unitAmount)}`;

/** Charges, newest first. */
export const sortChargesNewestFirst = (charges: Charge[]): Charge[] =>
  [...charges].sort((a, b) =>
    (b.metadata?.creationTimestamp ?? '').localeCompare(a.metadata?.creationTimestamp ?? '')
  );
