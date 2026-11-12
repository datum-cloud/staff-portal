import type { ContractFee } from './contract';
import { contractInvoiceSchedule, notableInvoices, upcomingInvoices } from './contract-schedule';
import { describe, expect, it } from 'vitest';

const fee = (changes: Partial<ContractFee> & Pick<ContractFee, 'name'>): ContractFee => ({
  label: changes.name,
  chargeType: 'Recurring',
  amount: 100,
  quantity: 1,
  interval: 'monthly',
  billingTiming: 'InAdvance',
  ...changes,
});

const day = (date: Date) => date.toISOString().slice(0, 10);

describe('contractInvoiceSchedule', () => {
  // A contract starting 12 November 2026, net 30: one-time fees, a
  // quarterly and an annual fee in arrears, and a monthly one in advance.
  const startsAt = new Date('2026-11-12T00:00:00Z');
  const fees = [
    fee({ name: 'setup', chargeType: 'OneTime', amount: 2500, interval: undefined }),
    fee({ name: 'support', amount: 20000, interval: 'quarterly', billingTiming: 'InArrears' }),
    fee({ name: 'link', amount: 6000, interval: 'annual', billingTiming: 'InArrears' }),
    fee({ name: 'ports', amount: 300 }),
  ];
  const schedule = contractInvoiceSchedule({ startsAt, fees, billsUsage: true, netDays: 30 });
  const on = (date: string) => schedule.find((invoice) => day(invoice.date) === date);
  const names = (date: string) => on(date)?.charges.map((charge) => charge.name);

  it('invoices one-time fees and fees in advance when the contract starts', () => {
    expect(names('2026-11-12')).toEqual(['setup', 'ports']);
    expect(on('2026-11-12')).toMatchObject({ total: 2800, billsUsage: false });
    expect(day(on('2026-11-12')?.dueDate as Date)).toBe('2026-12-12');
  });

  it('invoices fees in arrears at the end of their own period, with usage', () => {
    expect(names('2026-12-12')).toEqual(['ports']);
    expect(on('2026-12-12')?.billsUsage).toBe(true);
    expect(names('2027-02-12')).toEqual(['support', 'ports']);
    const support = on('2027-02-12')?.charges[0];
    expect([day(support?.period?.from as Date), day(support?.period?.to as Date)]).toEqual([
      '2026-11-12',
      '2027-02-12',
    ]);
    expect(names('2027-11-12')).toEqual(['support', 'link', 'ports']);
    expect(on('2027-11-12')?.total).toBe(26300);
  });

  it('covers every month for a year, since usage is billed monthly', () => {
    expect(schedule).toHaveLength(13);
  });

  it("leaves out months with nothing to invoice when usage isn't billed", () => {
    const quarterly = contractInvoiceSchedule({
      startsAt,
      fees: [
        fee({ name: 'support', amount: 900, interval: 'quarterly', billingTiming: 'InArrears' }),
      ],
      billsUsage: false,
    });
    expect(quarterly.map((invoice) => day(invoice.date))).toEqual([
      '2027-02-12',
      '2027-05-12',
      '2027-08-12',
      '2027-11-12',
    ]);
    expect(quarterly[0].dueDate).toBeUndefined();
  });

  it('bills on the last day of a shorter month', () => {
    const [, february] = contractInvoiceSchedule({
      startsAt: new Date('2027-01-31T00:00:00Z'),
      fees: [fee({ name: 'ports' })],
      billsUsage: false,
      months: 1,
    });
    expect(day(february.date)).toBe('2027-02-28');
  });

  it("takes each fee's discount off", () => {
    const [first] = contractInvoiceSchedule({
      startsAt,
      fees: [fee({ name: 'ports', amount: 300, quantity: 2, discount: 10 })],
      billsUsage: false,
    });
    expect(first.total).toBe(540);
  });
});

describe('upcoming and notable invoices', () => {
  const startsAt = new Date('2026-11-12T00:00:00Z');
  const schedule = contractInvoiceSchedule({
    startsAt,
    fees: [
      fee({ name: 'ports' }),
      fee({ name: 'support', interval: 'quarterly', billingTiming: 'InArrears' }),
    ],
    billsUsage: true,
  });

  it('leaves out the invoices already dated', () => {
    const upcoming = upcomingInvoices(schedule, new Date('2026-11-12T23:00:00Z'));
    expect(day(upcoming[0].date)).toBe('2026-12-12');
  });

  it('points out the next invoice and those charging a longer fee', () => {
    const upcoming = upcomingInvoices(schedule, new Date('2026-11-12T23:00:00Z'));
    expect(notableInvoices(upcoming).map((invoice) => day(invoice.date))).toEqual([
      '2026-12-12',
      '2027-02-12',
      '2027-05-12',
      '2027-08-12',
    ]);
  });
});
