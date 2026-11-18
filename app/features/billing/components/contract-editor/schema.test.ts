import {
  buildContractSchema,
  fromListFeeRowValues,
  fromUsageRowValues,
  toListFeeRowValues,
  toUsageRowValues,
  type ContractFormValues,
} from './schema';
import { describe, expect, it, vi } from 'vitest';

// Lingui's macros are compiled away in the app; tests run the source as is.
vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));

describe('usage rows', () => {
  it('leave list rates empty in the form, and fill them back in', () => {
    const row = {
      metric: 'cpu',
      selected: true,
      pricingName: 'compute-vcpu-v1',
      discount: '',
      custom: false,
      amounts: ['0.000014', '0.000012'],
    };
    const values = toUsageRowValues(row);
    expect(values.amounts).toEqual(['', '']);
    expect(fromUsageRowValues(values, ['0.000014', '0.000012'])).toMatchObject({
      custom: false,
      amounts: ['0.000014', '0.000012'],
    });
  });

  it("keep the customer's rates, filling empty ones from the list", () => {
    const values = toUsageRowValues({
      metric: 'cpu',
      selected: true,
      pricingName: 'compute-vcpu-v1',
      discount: '',
      custom: true,
      amounts: ['0.00001', '0.000012'],
    });
    expect(values.amounts).toEqual(['0.00001', '0.000012']);
    expect(
      fromUsageRowValues({ ...values, amounts: ['0.00001', ''] }, ['0.000014', '0.000012'])
    ).toMatchObject({ custom: true, amounts: ['0.00001', '0.000012'] });
  });
});

describe('list fee rows', () => {
  it('leave the list amount empty, and mark a typed one as the customer amount', () => {
    const base = {
      name: 'cross-connect-v1',
      selected: true,
      quantity: '4',
      discount: '',
      custom: false,
      amount: '300.00',
      billingTiming: 'InArrears' as const,
      periods: '',
    };
    expect(toListFeeRowValues(base).amount).toBe('');
    expect(toListFeeRowValues({ ...base, custom: true, amount: '250.00' }).amount).toBe('250.00');
    expect(fromListFeeRowValues({ ...toListFeeRowValues(base), amount: '250' }).custom).toBe(true);
    expect(fromListFeeRowValues(toListFeeRowValues(base)).custom).toBe(false);
    expect(toListFeeRowValues({ ...base, billingTiming: 'InAdvance' }).billingTiming).toBe(
      'InAdvance'
    );
  });
});

describe('buildContractSchema', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  const empty: ContractFormValues = { fees: [], usage: [], listFees: [], startsAt: undefined };
  const listFee = {
    name: 'cross-connect-v1',
    selected: true,
    quantity: '2',
    discount: '',
    amount: '',
    billingTiming: 'InArrears' as const,
    periods: '',
  };
  const fee = {
    label: 'Annual support',
    chargeType: 'Recurring' as const,
    interval: 'annual' as const,
    billingTiming: 'InAdvance' as const,
    periods: '',
    amount: '6000',
    quantity: '1',
    pricingUnit: '',
    serviceRef: 'none',
  };

  it('takes renewals as a whole number from 1, or blank for no end', () => {
    const schema = buildContractSchema(false, true, now);
    expect(schema.safeParse({ ...empty, fees: [{ ...fee, periods: '36' }] }).success).toBe(true);
    expect(schema.safeParse({ ...empty, fees: [{ ...fee, periods: '' }] }).success).toBe(true);
    const result = schema.safeParse({
      ...empty,
      fees: [{ ...fee, periods: '0' }],
      listFees: [{ ...listFee, periods: '1201' }],
    });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual([
      'fees.0.periods',
      'listFees.0.periods',
    ]);
  });

  it("takes a recurring fee's interval and timing, and refuses others", () => {
    const schema = buildContractSchema(false, true, now);
    expect(schema.safeParse({ ...empty, fees: [fee] }).success).toBe(true);
    const result = schema.safeParse({
      ...empty,
      fees: [{ ...fee, interval: 'weekly', billingTiming: 'Never' }],
    });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual([
      'fees.0.interval',
      'fees.0.billingTiming',
    ]);
  });

  it('needs something to bill: a fee of its own, or one or usage from the price list', () => {
    const schema = buildContractSchema(false, true, now);
    expect(schema.safeParse(empty).success).toBe(false);
    expect(schema.safeParse({ ...empty, listFees: [listFee] }).success).toBe(true);
    const meter = {
      metric: 'cpu',
      selected: true,
      pricingName: 'compute-vcpu-v1',
      discount: '',
      amounts: [''],
    };
    expect(schema.safeParse({ ...empty, usage: [meter] }).success).toBe(true);
    expect(schema.safeParse({ ...empty, usage: [{ ...meter, selected: false }] }).success).toBe(
      false
    );
  });

  it("checks a list fee's quantity, discount and customer amount", () => {
    const schema = buildContractSchema(false, true, now);
    const result = schema.safeParse({
      ...empty,
      listFees: [{ ...listFee, quantity: '0', discount: '120', amount: 'abc' }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual([
      'listFees.0.quantity',
      'listFees.0.discount',
      'listFees.0.amount',
    ]);
  });

  it('lets a draft leave the start date for later, but not a published contract', () => {
    let draft = false;
    const schema = buildContractSchema(true, true, now, () => draft);
    const values = { ...empty, listFees: [listFee] };
    expect(schema.safeParse(values).error?.issues.map((i) => i.path.join('.'))).toEqual([
      'startsAt',
    ]);
    draft = true;
    expect(schema.safeParse(values).success).toBe(true);
    // A date it does have is still checked.
    expect(schema.safeParse({ ...values, startsAt: new Date('2000-01-01') }).success).toBe(false);
  });

  it("ignores rows that aren't ticked", () => {
    const schema = buildContractSchema(false, true, now);
    expect(
      schema.safeParse({
        ...empty,
        listFees: [listFee, { ...listFee, name: 'other', selected: false, quantity: 'x' }],
      }).success
    ).toBe(true);
  });
});

describe('digitsOnly', () => {
  it('drops anything that is not a digit', async () => {
    const { digitsOnly } = await import('./whole-number-input');
    expect(digitsOnly('1a2b')).toBe('12');
    expect(digitsOnly('-3.5')).toBe('35');
    expect(digitsOnly('abc')).toBe('');
  });
});
