import { addMonths, format } from 'date-fns';

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

function addPeriod(start: Date, frequency: InvoiceFrequency): Date {
  return addMonths(start, FREQUENCY_MONTHS[frequency]);
}

function subtractPeriod(start: Date, frequency: InvoiceFrequency): Date {
  return addMonths(start, -FREQUENCY_MONTHS[frequency]);
}

/** Latest cycle start at or before `ref`, anchored on `invoiceDay`. */
function cycleStartAtOrBefore(ref: Date, invoiceDay: number, frequency: InvoiceFrequency): Date {
  const periodMonths = FREQUENCY_MONTHS[frequency];
  let start = anchorDate(ref.getUTCFullYear(), ref.getUTCMonth(), invoiceDay);

  while (start > ref) {
    start = addMonths(start, -periodMonths);
  }
  while (addMonths(start, periodMonths) <= ref) {
    start = addMonths(start, periodMonths);
  }

  return start;
}

function formatCycleRange(start: Date, end: Date): string {
  const startLabel = format(start, 'd MMM');
  const endLabel = format(end, 'd MMM yyyy');
  return `${startLabel} - ${endLabel}`;
}

/**
 * Build current + previous billing windows from a billing account's
 * `spec.paymentTerms`. Query end for the current cycle is capped at now.
 */
export function buildBillingCycleWindows(
  terms: PaymentTermsInput | undefined,
  now = new Date()
): BillingCycleWindow[] {
  const invoiceDay = terms?.invoiceDayOfMonth ?? 1;
  const frequency = terms?.invoiceFrequency ?? 'Monthly';

  const currentStart = cycleStartAtOrBefore(now, invoiceDay, frequency);
  const currentEndBoundary = addPeriod(currentStart, frequency);
  const previousStart = subtractPeriod(currentStart, frequency);
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
  const invoiceDay = terms?.invoiceDayOfMonth ?? 1;
  const frequency = terms?.invoiceFrequency ?? 'Monthly';
  return addPeriod(cycleStartAtOrBefore(now, invoiceDay, frequency), frequency);
}

/**
 * The same point in the previous cycle as `now` is in the current one, for
 * comparing spend so far against last cycle's at that point.
 */
export function getPreviousCycleCutoff(
  terms: PaymentTermsInput | undefined,
  now = new Date()
): Date {
  const invoiceDay = terms?.invoiceDayOfMonth ?? 1;
  const frequency = terms?.invoiceFrequency ?? 'Monthly';
  const currentStart = cycleStartAtOrBefore(now, invoiceDay, frequency);
  // In UTC: date-fns' addMonths keeps local wall-clock time, which shifts by
  // an hour across a daylight-saving change.
  const previousStart = anchorDate(
    currentStart.getUTCFullYear(),
    currentStart.getUTCMonth() - FREQUENCY_MONTHS[frequency],
    invoiceDay
  );
  return new Date(previousStart.getTime() + (now.getTime() - currentStart.getTime()));
}

export function selectBillingCycleWindow(
  windows: BillingCycleWindow[],
  cycle: string | null | undefined
): BillingCycleWindow {
  return windows.find((window) => window.value === cycle) ?? windows[0];
}
