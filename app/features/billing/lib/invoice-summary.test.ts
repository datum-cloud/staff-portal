import { parseAmount, type Invoice } from '../utils';
import {
  getAgingBucket,
  getAmountOwed,
  getDaysOverdue,
  getNextInvoice,
  sortInvoicesPastDueFirst,
  summarizeInvoices,
} from './invoice-summary';
import { buildInvoice } from './test-fixtures';
import { describe, expect, it } from 'vitest';

const NOW = new Date('2026-11-12T12:00:00Z');

const invoice = buildInvoice;

describe('parseAmount', () => {
  it.each([
    ['12.50', 12.5],
    ['0', 0],
    [undefined, 0],
    ['abc', 0],
  ])('parses %j as %d', (value, expected) => {
    expect(parseAmount(value)).toBe(expected);
  });
});

describe('getAmountOwed', () => {
  it('prefers amountDue', () => {
    expect(getAmountOwed(invoice('a', { total: '100', amountDue: '40' }))).toBe(40);
  });

  it('falls back to the total before the provider sets amountDue', () => {
    expect(getAmountOwed(invoice('a', { total: '100' }))).toBe(100);
  });
});

describe('getDaysOverdue', () => {
  it('counts whole days since the due date', () => {
    expect(getDaysOverdue(invoice('a', { dueDate: '2026-10-14T00:00:00Z' }), NOW)).toBe(29);
  });

  it('is 0 before the due date or without one', () => {
    expect(getDaysOverdue(invoice('a', { dueDate: '2026-12-01T00:00:00Z' }), NOW)).toBe(0);
    expect(getDaysOverdue(invoice('a', {}), NOW)).toBe(0);
  });
});

describe('getAgingBucket', () => {
  it.each([
    ['2026-11-01T00:00:00Z', 'days1to30'],
    ['2026-10-01T00:00:00Z', 'days31to60'],
    ['2026-08-01T00:00:00Z', 'days60plus'],
  ] as const)('puts a past-due invoice due %s in %s', (dueDate, bucket) => {
    expect(getAgingBucket(invoice('a', { phase: 'PastDue', dueDate }), NOW)).toBe(bucket);
  });

  it('treats Open invoices as not yet due', () => {
    expect(
      getAgingBucket(invoice('a', { phase: 'Open', dueDate: '2026-10-01T00:00:00Z' }), NOW)
    ).toBe('notDue');
  });
});

describe('summarizeInvoices', () => {
  const invoices = [
    invoice('past-due', {
      phase: 'PastDue',
      total: '4153100',
      amountDue: '4153100',
      dueDate: '2026-10-14T00:00:00Z',
    }),
    invoice('open', { phase: 'Open', total: '195.5', amountDue: '195.5' }),
    invoice('projecting', { total: '10' }),
    invoice('paid', { phase: 'Paid', total: '0.69', amountPaid: '0.69', amountDue: '0' }),
    invoice('void', { phase: 'Void', total: '50', amountDue: '50' }),
  ];

  it('totals what is owed and past due', () => {
    const summary = summarizeInvoices(invoices, NOW);
    expect(summary.outstanding).toBeCloseTo(4153305.5);
    expect(summary.unpaidCount).toBe(3);
    expect(summary.pastDue).toBe(4153100);
    expect(summary.pastDueCount).toBe(1);
    expect(summary.maxDaysOverdue).toBe(29);
  });

  it('ages unpaid invoices', () => {
    expect(summarizeInvoices(invoices, NOW).aging).toEqual({
      notDue: 205.5,
      days1to30: 4153100,
      days31to60: 0,
      days60plus: 0,
    });
  });

  it('sums amountPaid for lifetime paid', () => {
    const summary = summarizeInvoices(invoices, NOW);
    expect(summary.lifetimePaid).toBe(0.69);
    expect(summary.paidCount).toBe(1);
  });

  it('is all zeros with no invoices', () => {
    expect(summarizeInvoices([], NOW)).toMatchObject({
      outstanding: 0,
      pastDue: 0,
      lifetimePaid: 0,
      maxDaysOverdue: 0,
    });
  });
});

describe('sortInvoicesPastDueFirst', () => {
  it('pins past-due invoices, then sorts by newest period', () => {
    const sorted = sortInvoicesPastDueFirst([
      invoice('sep', { phase: 'Open' }, '2026-09-30T00:00:00Z'),
      invoice('aug', { phase: 'PastDue' }, '2026-08-31T00:00:00Z'),
      invoice('oct', { phase: 'Paid' }, '2026-10-31T00:00:00Z'),
    ]);
    expect(sorted.map((i) => i.metadata?.name)).toEqual(['aug', 'oct', 'sep']);
  });
});

describe('getNextInvoice', () => {
  it('issues on the next cycle start and adds net days', () => {
    const next = getNextInvoice(
      {
        spec: {
          currencyCode: 'USD',
          paymentTerms: { invoiceFrequency: 'Monthly', invoiceDayOfMonth: 1, netDays: 30 },
        },
      },
      NOW
    );
    expect(next.issuedAt.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(next.dueAt?.toISOString()).toBe('2026-12-31T00:00:00.000Z');
    expect(next.frequency).toBe('Monthly');
  });

  it('defaults to monthly on day 1 with no due date', () => {
    const next = getNextInvoice({ spec: { currencyCode: 'USD' } }, NOW);
    expect(next.issuedAt.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(next.dueAt).toBeUndefined();
  });

  const onTerms = {
    spec: {
      currencyCode: 'USD',
      paymentTerms: { invoiceFrequency: 'Monthly' as const, invoiceDayOfMonth: 1, netDays: 30 },
    },
  };

  it("is a contract's first invoice, on the day it starts, before it starts", () => {
    const startsAt = new Date('2026-11-20T00:00:00Z');
    const next = getNextInvoice(onTerms, NOW, { startsAt, started: false });
    expect(next.issuedAt.toISOString()).toBe('2026-11-20T00:00:00.000Z');
    expect(next.dueAt?.toISOString()).toBe('2026-12-20T00:00:00.000Z');
    expect(next.contractStart).toBe(true);
  });

  it("follows a started contract's billing day, not the payment terms'", () => {
    const startsAt = new Date('2026-11-10T00:00:00Z');
    const next = getNextInvoice(onTerms, NOW, { startsAt, started: true });
    expect(next.issuedAt.toISOString()).toBe('2026-12-10T00:00:00.000Z');
    expect(next.frequency).toBe('Monthly');
    expect(next.contractStart).toBeUndefined();
  });
});
