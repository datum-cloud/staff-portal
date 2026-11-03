import { getEffectiveNetDays, getInvoicePhase, parseAmount, type Invoice } from '../utils';
import {
  getNextCycleStart,
  resolveCycleTerms,
  type InvoiceFrequency,
} from '@/modules/billing/billing-cycle';
import { DAY_MS } from '@/utils/helpers/time.helper';
import type { ComMiloapisBillingV1Alpha1BillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';

/**
 * Money and aging for one billing account's invoices, as the dashboard's
 * health cards, aging strip and checks read them. Invoices without a phase
 * are still being projected by the provider and count as Open, like the
 * past-invoices table.
 */

export type InvoiceAgingBucket = 'notDue' | 'days1to30' | 'days31to60' | 'days60plus';

export const INVOICE_AGING_BUCKETS: readonly InvoiceAgingBucket[] = [
  'notDue',
  'days1to30',
  'days31to60',
  'days60plus',
];

export interface InvoiceSummary {
  /** Sum still owed on Open and PastDue invoices. */
  outstanding: number;
  unpaidCount: number;
  /** Sum still owed on PastDue invoices. */
  pastDue: number;
  pastDueCount: number;
  /** Days the oldest past-due invoice is overdue; 0 when none is. */
  maxDaysOverdue: number;
  /** Amount owed by how far past its due date each unpaid invoice is. */
  aging: Readonly<Record<InvoiceAgingBucket, number>>;
  /** Sum of `amountPaid` across every invoice. */
  lifetimePaid: number;
  paidCount: number;
}

/** A decimal string from the API as a number; missing or malformed is 0. */
export const isUnpaidInvoice = (invoice: Invoice): boolean => {
  const phase = getInvoicePhase(invoice);
  return phase === 'Open' || phase === 'PastDue';
};

export const isPastDueInvoice = (invoice: Invoice): boolean =>
  getInvoicePhase(invoice) === 'PastDue';

/** What is still owed: `amountDue`, or the total before the provider sets it. */
export const getAmountOwed = (invoice: Invoice): number =>
  invoice.status?.amountDue !== undefined
    ? parseAmount(invoice.status.amountDue)
    : parseAmount(invoice.status?.total);

/** Whole days since `dueDate`; 0 before it or without one. */
export const getDaysOverdue = (invoice: Invoice, now: Date): number => {
  const due = Date.parse(invoice.status?.dueDate ?? '');
  if (Number.isNaN(due)) return 0;
  return Math.max(0, Math.floor((now.getTime() - due) / DAY_MS));
};

export const getAgingBucket = (invoice: Invoice, now: Date): InvoiceAgingBucket => {
  const days = isPastDueInvoice(invoice) ? Math.max(1, getDaysOverdue(invoice, now)) : 0;
  if (days === 0) return 'notDue';
  if (days <= 30) return 'days1to30';
  if (days <= 60) return 'days31to60';
  return 'days60plus';
};

const emptyAging = (): Record<InvoiceAgingBucket, number> => ({
  notDue: 0,
  days1to30: 0,
  days31to60: 0,
  days60plus: 0,
});

export const summarizeInvoices = (invoices: readonly Invoice[], now: Date): InvoiceSummary => {
  const unpaid = invoices.filter(isUnpaidInvoice);
  const pastDue = unpaid.filter(isPastDueInvoice);
  const paid = invoices.filter((invoice) => parseAmount(invoice.status?.amountPaid) > 0);
  const sumOwed = (list: readonly Invoice[]) =>
    list.reduce((sum, invoice) => sum + getAmountOwed(invoice), 0);

  return {
    outstanding: sumOwed(unpaid),
    unpaidCount: unpaid.length,
    pastDue: sumOwed(pastDue),
    pastDueCount: pastDue.length,
    maxDaysOverdue: pastDue.reduce(
      (max, invoice) => Math.max(max, getDaysOverdue(invoice, now)),
      0
    ),
    aging: unpaid.reduce((aging, invoice) => {
      const bucket = getAgingBucket(invoice, now);
      return { ...aging, [bucket]: aging[bucket] + getAmountOwed(invoice) };
    }, emptyAging()),
    lifetimePaid: paid.reduce((sum, invoice) => sum + parseAmount(invoice.status?.amountPaid), 0),
    paidCount: paid.length,
  };
};

const periodEndMs = (invoice: Invoice): number => {
  const end = Date.parse(invoice.spec?.period?.end ?? '');
  return Number.isNaN(end) ? Number.NEGATIVE_INFINITY : end;
};

/** Past-due invoices first, then newest period first. Returns a new array. */
export const sortInvoicesPastDueFirst = (invoices: readonly Invoice[]): Invoice[] =>
  [...invoices].sort(
    (a, b) =>
      Number(isPastDueInvoice(b)) - Number(isPastDueInvoice(a)) || periodEndMs(b) - periodEndMs(a)
  );

export interface NextInvoice {
  /** When the current cycle closes and its invoice is issued. */
  issuedAt: Date;
  /** `issuedAt` plus the net days in effect, when there are some. */
  dueAt?: Date;
  frequency: InvoiceFrequency;
  netDays?: number;
}

/**
 * The next invoice's dates: the cycle from the account's payment terms, and
 * the net days in effect (a staff arrangement's, or the standard terms').
 * There is no amount: billing doesn't estimate one.
 */
export const getNextInvoice = (
  account: ComMiloapisBillingV1Alpha1BillingAccount,
  now: Date
): NextInvoice => {
  const terms = account.spec?.paymentTerms;
  const issuedAt = getNextCycleStart(terms, now);
  const netDays = getEffectiveNetDays(account);
  return {
    issuedAt,
    dueAt: netDays !== undefined ? new Date(issuedAt.getTime() + netDays * DAY_MS) : undefined,
    frequency: resolveCycleTerms(terms).frequency,
    netDays,
  };
};
