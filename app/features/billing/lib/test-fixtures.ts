import type { Invoice } from '../utils';

/** An invoice on `ba-test` for October 2026, unless `periodEnd` says otherwise. Tests only. */
export const buildInvoice = (
  name: string,
  status: NonNullable<Invoice['status']>,
  periodEnd = '2026-10-31T00:00:00Z'
): Invoice => ({
  metadata: { name },
  spec: {
    billingAccountRef: { name: 'ba-test' },
    period: { start: '2026-10-01T00:00:00Z', end: periodEnd },
  },
  status,
});

/** A fully paid invoice for `total`. Tests only. */
export const buildPaidInvoice = (name: string, total: string): Invoice =>
  buildInvoice(name, { phase: 'Paid', total, amountPaid: total, amountDue: '0' });
