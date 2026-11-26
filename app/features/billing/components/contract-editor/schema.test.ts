import {
  buildContractSchema,
  fromListFeeRowValues,
  fromUsageRowValues,
  toListFeeRowValues,
  toUsageRowValues,
  type ContractFormValues,
} from './schema';
import { digitsOnly } from './whole-number-input';
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
      setPeriod: false,
      periodStart: '',
      periodEnd: '',
    };
    expect(toListFeeRowValues(base).amount).toBe('');
    expect(toListFeeRowValues({ ...base, custom: true, amount: '250.00' }).amount).toBe('250.00');
    expect(fromListFeeRowValues({ ...toListFeeRowValues(base), amount: '250' }).custom).toBe(true);
    expect(fromListFeeRowValues(toListFeeRowValues(base)).custom).toBe(false);
    expect(toListFeeRowValues({ ...base, billingTiming: 'InAdvance' }).billingTiming).toBe(
      'InAdvance'
    );
  });

  it('keep a supply date', () => {
    const supplied = {
      name: 'rack-install-v1',
      selected: true,
      quantity: '1',
      discount: '',
      custom: false,
      amount: '500.00',
      billingTiming: 'InArrears' as const,
      periods: '',
      setPeriod: true,
      periodStart: '2027-03-03',
      periodEnd: '2027-03-05',
    };
    expect(fromListFeeRowValues(toListFeeRowValues(supplied))).toMatchObject({
      setPeriod: true,
      periodStart: '2027-03-03',
      periodEnd: '2027-03-05',
    });
  });
});

describe('buildContractSchema', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  const empty: ContractFormValues = {
    fees: [],
    usage: [],
    listFees: [],
    startsAt: undefined,
    billingDay: 'StartDate',
  };
  const listFee = {
    name: 'cross-connect-v1',
    selected: true,
    quantity: '2',
    discount: '',
    amount: '',
    billingTiming: 'InArrears' as const,
    periods: '',
    setPeriod: false,
    periodStart: '',
    periodEnd: '',
  };
  const fee = {
    label: 'Annual support',
    chargeType: 'Recurring' as const,
    interval: 'annual' as const,
    billingTiming: 'InAdvance' as const,
    periods: '',
    setPeriod: false,
    periodStart: '',
    periodEnd: '',
    amount: '6000',
    quantity: '1',
    pricingUnit: '',
    sku: '',
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

  it('takes a SKU of letters, numbers, dots, dashes and underscores', () => {
    const schema = buildContractSchema(false, true, now);
    const parse = (sku: string) => schema.safeParse({ ...empty, fees: [{ ...fee, sku }] });
    expect(parse('').success).toBe(true);
    expect(parse('DC-CAB_01.v2').success).toBe(true);
    expect(parse('DC CAB').error?.issues.map((i) => i.path.join('.'))).toEqual(['fees.0.sku']);
    expect(parse('-DC').success).toBe(false);
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

  it("needs the customer's amount for a list fee priced per contract, even in a draft", () => {
    const schema = buildContractSchema(false, true, now, () => true, new Set(['cage-build-v1']));
    const cageBuild = { ...listFee, name: 'cage-build-v1' };
    const result = schema.safeParse({ ...empty, listFees: [cageBuild] });
    expect(result.error?.issues.map((i) => i.path.join('.'))).toEqual(['listFees.0.amount']);
    expect(
      schema.safeParse({ ...empty, listFees: [{ ...cageBuild, amount: '42000' }] }).success
    ).toBe(true);
    // Other list fees still bill their list amount when it's left empty.
    expect(schema.safeParse({ ...empty, listFees: [listFee] }).success).toBe(true);
  });

  describe("a one-time fee's supply date", () => {
    const setup = { ...fee, label: 'Cage install', chargeType: 'OneTime' as const };
    const install = { ...listFee, name: 'rack-install-v1' };
    const paths = (values: Partial<ContractFormValues>) =>
      buildContractSchema(false, true, now)
        .safeParse({ ...empty, ...values })
        .error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];

    it('is optional: unticked, the fee is supplied the day it is charged', () => {
      expect(paths({ fees: [setup], listFees: [install] })).toEqual([]);
    });

    it('takes a day or a span of days, whenever they are', () => {
      const days = { setPeriod: true, periodStart: '2027-03-03', periodEnd: '2027-03-05' };
      const longAgo = { setPeriod: true, periodStart: '2019-01-01', periodEnd: '2019-01-01' };
      expect(
        paths({ fees: [{ ...setup, ...days }], listFees: [{ ...install, ...longAgo }] })
      ).toEqual([]);
    });

    it("needs both days, and the end can't be before the start", () => {
      expect(
        paths({
          fees: [{ ...setup, setPeriod: true, periodStart: '2027-03-05', periodEnd: '2027-03-03' }],
          listFees: [{ ...install, setPeriod: true, periodStart: '', periodEnd: '' }],
        })
      ).toEqual([
        "fees.0.periodEnd: The end can't be before the start.",
        'listFees.0.periodStart: Pick a start date.',
        'listFees.0.periodEnd: Pick an end date.',
      ]);
    });

    it('can be up to five years long, as a charge', () => {
      expect(
        paths({
          fees: [{ ...setup, setPeriod: true, periodStart: '2027-01-01', periodEnd: '2032-01-02' }],
        })
      ).toEqual(['fees.0.periodEnd: A supply date can be up to 5 years long.']);
    });

    it('is ignored on a recurring fee, and on a list fee that is not ticked', () => {
      const bad = { setPeriod: true, periodStart: '2027-03-05', periodEnd: '2027-03-03' };
      expect(
        paths({
          fees: [{ ...fee, ...bad }],
          listFees: [install, { ...install, name: 'other', selected: false, ...bad }],
        })
      ).toEqual([]);
    });
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
  it('drops anything that is not a digit', () => {
    expect(digitsOnly('1a2b')).toBe('12');
    expect(digitsOnly('-3.5')).toBe('35');
    expect(digitsOnly('abc')).toBe('');
  });
});
