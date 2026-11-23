import { supplyDateText } from '../contract-fee-text';
import { billsNoUsage, summaryFees } from './contract-summary';
import type { ContractFeeRow, ListFeeRowValues } from './schema';
import { describe, expect, it, vi } from 'vitest';

// Lingui's macros are compiled away in the app; tests run the source as is.
vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));

const days = { setPeriod: true, periodStart: '2027-03-03', periodEnd: '2027-03-05' };
const unset = { setPeriod: false, periodStart: '', periodEnd: '' };

const own = (changes: Partial<ContractFeeRow>): ContractFeeRow => ({
  label: 'Cage install',
  chargeType: 'OneTime',
  interval: 'monthly',
  billingTiming: 'InArrears',
  periods: '',
  ...unset,
  amount: '1500',
  quantity: '1',
  pricingUnit: '',
  sku: '',
  serviceRef: 'none',
  ...changes,
});

const listRow = (name: string, changes: Partial<ListFeeRowValues> = {}): ListFeeRowValues => ({
  name,
  selected: true,
  quantity: '1',
  discount: '',
  amount: '',
  billingTiming: 'InArrears',
  periods: '',
  ...unset,
  ...changes,
});

const option = (name: string, chargeType: 'OneTime' | 'Recurring') => ({
  name,
  label: name,
  chargeType,
  serviceRef: '',
  pricingUnit: '',
  sku: '',
  amount: '500.00',
  description: '',
  notes: '',
  ...(chargeType === 'Recurring' ? { interval: 'monthly' as const } : {}),
});

describe('summaryFees', () => {
  it("lists a one-time fee's supply date, from its own row or the price list", () => {
    const fees = summaryFees(
      [own(days), own({ label: 'Setup' })],
      [listRow('rack-install-v1', days)],
      [option('rack-install-v1', 'OneTime')]
    );
    expect(fees.map((fee) => [fee.key, fee.servicePeriod])).toEqual([
      ['own-0', { start: '2027-03-03', end: '2027-03-05' }],
      ['own-1', undefined],
      ['list-rack-install-v1', { start: '2027-03-03', end: '2027-03-05' }],
    ]);
  });

  it("leaves a recurring fee's dates out, and price list rows that aren't ticked", () => {
    const fees = summaryFees(
      [own({ ...days, chargeType: 'Recurring' })],
      [listRow('cross-connect-v1', days), listRow('rack-install-v1', { ...days, selected: false })],
      [option('cross-connect-v1', 'Recurring'), option('rack-install-v1', 'OneTime')]
    );
    expect(fees.map((fee) => fee.key)).toEqual(['own-0', 'list-cross-connect-v1']);
    expect(fees.every((fee) => fee.servicePeriod === undefined)).toBe(true);
    expect(fees[0]).toMatchObject({ interval: 'monthly', billingTiming: 'InArrears' });
  });
});

describe('supplyDateText', () => {
  it('reads as a day or a span of days', () => {
    expect(supplyDateText({ start: '2027-03-03', end: '2027-03-03' })).toBe(
      'Supply date Mar 3, 2027'
    );
    expect(supplyDateText({ start: '2027-03-03', end: '2027-03-05' })).toBe(
      'Supply date Mar 3, 2027 – Mar 5, 2027'
    );
  });
});

describe('billsNoUsage', () => {
  it('warns about fees with no usage, not about usage or an empty contract', () => {
    expect(billsNoUsage(2, 0)).toBe(true);
    expect(billsNoUsage(2, 3)).toBe(false);
    expect(billsNoUsage(0, 3)).toBe(false);
    expect(billsNoUsage(0, 0)).toBe(false);
  });
});
