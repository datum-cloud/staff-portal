import { DAY_MS } from '@/utils/helpers/time.helper';

export type InvoiceFrequency = 'Monthly' | 'Quarterly' | 'Annual';

export interface PaymentTermsInput {
  invoiceDayOfMonth?: number;
  invoiceFrequency?: InvoiceFrequency;
}

export interface BillingCycleWindow {
  value: 'current' | 'previous';
  label: string;
  /** Short range for card descriptions, e.g. `1 Jun - 1 Jul 2026`. */
  rangeLabel: string;
  startSec: number;
  endSec: number;
}

/** The account's cycle with billing's defaults filled in: monthly, on the 1st. */
export const resolveCycleTerms = (
  terms: PaymentTermsInput | undefined
): { invoiceDay: number; frequency: InvoiceFrequency } => ({
  invoiceDay: terms?.invoiceDayOfMonth ?? 1,
  frequency: terms?.invoiceFrequency ?? 'Monthly',
});

const FREQUENCY_MONTHS: Record<InvoiceFrequency, number> = {
  Monthly: 1,
  Quarterly: 3,
  Annual: 12,
};

/** Clamp the invoice anchor day to the month's length (API allows 1–28). */
function anchorDate(year: number, month: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

/**
 * The cycle start `months` before or after `start`, anchored on `invoiceDay`.
 * All cycle maths is in UTC: date-fns' `addMonths` keeps local wall-clock
 * time, so in a browser west of UTC it lands on the previous day.
 */
function shiftCycle(start: Date, months: number, invoiceDay: number): Date {
  return anchorDate(start.getUTCFullYear(), start.getUTCMonth() + months, invoiceDay);
}

/**
 * Latest cycle start at or before `ref`, on `invoiceDay`. Cycles longer than
 * a month align to the calendar (quarters start Jan, Apr, Jul, Oct; years
 * start Jan), so the start stays put as `ref` moves through the cycle.
 */
function cycleStartAtOrBefore(ref: Date, invoiceDay: number, frequency: InvoiceFrequency): Date {
  const periodMonths = FREQUENCY_MONTHS[frequency];
  const thisMonth = ref.getUTCFullYear() * 12 + ref.getUTCMonth();
  // Before this month's invoice day, `ref` still belongs to last month's cycle.
  const month =
    anchorDate(ref.getUTCFullYear(), ref.getUTCMonth(), invoiceDay) > ref
      ? thisMonth - 1
      : thisMonth;
  const startMonth = Math.floor(month / periodMonths) * periodMonths;
  return anchorDate(Math.floor(startMonth / 12), startMonth % 12, invoiceDay);
}

const SHORT_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const SHORT_DATE_YEAR = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** E.g. `1 Jun - 1 Jul 2026`, in UTC like the cycle boundaries. */
function formatCycleRange(start: Date, end: Date): string {
  return `${SHORT_DATE.format(start)} - ${SHORT_DATE_YEAR.format(end)}`;
}

/**
 * Build current + previous billing windows from a billing account's
 * `spec.paymentTerms`. Query end for the current cycle is capped at now.
 */
export function buildBillingCycleWindows(
  terms: PaymentTermsInput | undefined,
  now = new Date()
): BillingCycleWindow[] {
  const { invoiceDay, frequency } = resolveCycleTerms(terms);

  const periodMonths = FREQUENCY_MONTHS[frequency];
  const currentStart = cycleStartAtOrBefore(now, invoiceDay, frequency);
  const currentEndBoundary = shiftCycle(currentStart, periodMonths, invoiceDay);
  const previousStart = shiftCycle(currentStart, -periodMonths, invoiceDay);
  const currentQueryEnd = new Date(Math.min(currentEndBoundary.getTime(), now.getTime()));

  const currentRange = formatCycleRange(currentStart, currentEndBoundary);
  const previousRange = formatCycleRange(previousStart, currentStart);

  return [
    {
      value: 'current',
      label: `Current billing cycle (${currentRange})`,
      rangeLabel: currentRange,
      startSec: Math.floor(currentStart.getTime() / 1000),
      endSec: Math.floor(currentQueryEnd.getTime() / 1000),
    },
    {
      value: 'previous',
      label: `Previous billing cycle (${previousRange})`,
      rangeLabel: previousRange,
      startSec: Math.floor(previousStart.getTime() / 1000),
      endSec: Math.floor(currentStart.getTime() / 1000),
    },
  ];
}

/** When the cycle containing `now` ends and the next invoice is issued. */
export function getNextCycleStart(terms: PaymentTermsInput | undefined, now = new Date()): Date {
  const { invoiceDay, frequency } = resolveCycleTerms(terms);
  return shiftCycle(
    cycleStartAtOrBefore(now, invoiceDay, frequency),
    FREQUENCY_MONTHS[frequency],
    invoiceDay
  );
}

/**
 * The same point in the previous cycle as `now` is in the current one, for
 * comparing spend so far against last cycle's at that point. Capped at the
 * previous cycle's end, for when it was the shorter of the two.
 */
export function getPreviousCycleCutoff(
  terms: PaymentTermsInput | undefined,
  now = new Date()
): Date {
  const { invoiceDay, frequency } = resolveCycleTerms(terms);
  const currentStart = cycleStartAtOrBefore(now, invoiceDay, frequency);
  const previousStart = shiftCycle(currentStart, -FREQUENCY_MONTHS[frequency], invoiceDay);
  const elapsed = now.getTime() - currentStart.getTime();
  return new Date(Math.min(previousStart.getTime() + elapsed, currentStart.getTime()));
}

export interface CycleProgress {
  start: Date;
  end: Date;
  /** 1-based day of the cycle `now` falls on. */
  day: number;
  days: number;
}

/** Where `now` sits in the cycle containing it. */
export function getCycleProgress(terms: PaymentTermsInput | undefined, now: Date): CycleProgress {
  const { invoiceDay, frequency } = resolveCycleTerms(terms);
  const start = cycleStartAtOrBefore(now, invoiceDay, frequency);
  const end = shiftCycle(start, FREQUENCY_MONTHS[frequency], invoiceDay);
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  const day = Math.min(days, Math.floor((now.getTime() - start.getTime()) / DAY_MS) + 1);
  return { start, end, day, days };
}

export function selectBillingCycleWindow(
  windows: BillingCycleWindow[],
  cycle: string | null | undefined
): BillingCycleWindow {
  return windows.find((window) => window.value === cycle) ?? windows[0];
}
