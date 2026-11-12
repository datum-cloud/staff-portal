import { contractOfferPlan, getContractFees } from './contract';
import {
  buildListFeePlan,
  listFeeNames,
  listFeeOptions,
  listFeeRowsFromOffer,
  type ListFeeRow,
} from './contract-list-fees';
import type {
  ComMiloapisBillingV1Alpha1Offer,
  ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

type Pricing = ComMiloapisBillingV1Alpha1ServicePricing;
type Spec = NonNullable<Pricing['spec']>;

const crossConnect: Spec = {
  chargeType: 'Recurring',
  currency: 'USD',
  serviceRef: 'bare-metal.datumapis.com',
  displayName: 'Cross connect',
  amount: '300.00',
  interval: 'monthly',
  pricingUnit: 'port',
};

const install: Spec = {
  chargeType: 'OneTime',
  currency: 'USD',
  displayName: 'Rack install',
  amount: '500.00',
  trigger: 'BillingAccountActivation',
};

const pricing = (name: string, spec: Spec, labels?: Record<string, string>) =>
  ({ metadata: { name, labels }, spec }) as Pricing;

const pricings = [
  pricing('cross-connect-v1', crossConnect),
  pricing('rack-install-v1', install),
  pricing('contract-acme-1-fee-1', {
    ...crossConnect,
    amount: '250.00',
    basedOn: 'cross-connect-v1',
  }),
  pricing('contract-acme-1-fee-2', install, {
    'billing.miloapis.com/contract-billing-account': 'acme',
  }),
  pricing('compute-vcpu-v1', {
    chargeType: 'Usage',
    currency: 'USD',
    serviceRef: 'compute.datumapis.com',
    metric: 'compute.datumapis.com/instance/milli-cpu-seconds',
    pricingUnit: 'vcpu-second',
    rates: [{ flat: '0.000014' }],
  }),
];

const options = listFeeOptions(pricings);

const offer = (
  refs: {
    name: string;
    quantity?: number;
    discount?: { percentage: number };
    billingTiming?: 'InAdvance' | 'InArrears';
    periods?: number;
  }[],
  snapshots: { name: string; spec: Spec; quantity?: number; discount?: { percentage: number } }[]
) =>
  ({
    metadata: { name: 'contract-acme-1' },
    spec: {
      chargeTypes: ['Recurring'],
      launchStage: 'GA',
      servicePricingRefs: refs.map((r) => ({ ...r, namespace: 'milo-system' })),
      servicePricings: snapshots,
    },
  }) as ComMiloapisBillingV1Alpha1Offer;

const row = (name: string, changes: Partial<ListFeeRow> = {}): ListFeeRow => ({
  name,
  selected: true,
  quantity: '1',
  discount: '',
  custom: false,
  amount: '',
  billingTiming: 'InArrears',
  periods: '',
  ...changes,
});

describe('listFeeOptions', () => {
  it('lists the list fees only, without customer or contract fees or usage', () => {
    expect(options.map((o) => [o.serviceRef, o.name, o.amount])).toEqual([
      ['', 'rack-install-v1', '500.00'],
      ['bare-metal.datumapis.com', 'cross-connect-v1', '300.00'],
    ]);
  });
});

describe('list fee rows', () => {
  it('start from the list fees an offer charges, with quantity and discount', () => {
    const current = offer(
      [{ name: 'cross-connect-v1', quantity: 4, discount: { percentage: 10 } }],
      [{ name: 'cross-connect-v1', spec: crossConnect, quantity: 4 }]
    );
    const rows = listFeeRowsFromOffer(options, current);
    expect(rows.find((r) => r.name === 'cross-connect-v1')).toMatchObject({
      selected: true,
      quantity: '4',
      discount: '10',
      custom: false,
      // The ref has no timing, so it's billed in advance.
      billingTiming: 'InAdvance',
    });
    expect(rows.find((r) => r.name === 'rack-install-v1')).toMatchObject({
      selected: false,
      billingTiming: 'InArrears',
    });
  });

  it("start from the timing the offer's reference sets", () => {
    const current = offer(
      [{ name: 'cross-connect-v1', billingTiming: 'InArrears' }],
      [{ name: 'cross-connect-v1', spec: crossConnect }]
    );
    expect(listFeeRowsFromOffer(options, current)[1]).toMatchObject({
      selected: true,
      billingTiming: 'InArrears',
    });
  });

  it("pick up the customer's own amount from the fee based on the list one", () => {
    const current = offer(
      [{ name: 'contract-acme-1-fee-1', quantity: 2 }],
      [
        {
          name: 'contract-acme-1-fee-1',
          spec: { ...crossConnect, amount: '250.00', basedOn: 'cross-connect-v1' },
          quantity: 2,
        },
      ]
    );
    expect(listFeeRowsFromOffer(options, current)[1]).toMatchObject({
      name: 'cross-connect-v1',
      selected: true,
      quantity: '2',
      custom: true,
      amount: '250.00',
      currentPricing: 'contract-acme-1-fee-1',
    });
    expect([...listFeeNames(listFeeRowsFromOffer(options, current))]).toContain(
      'contract-acme-1-fee-1'
    );
  });

  it("leave a second fee for the same list fee to the contract's own fees", () => {
    const current = offer(
      [{ name: 'cross-connect-v1', quantity: 2 }, { name: 'contract-acme-1-fee-1' }],
      [
        { name: 'cross-connect-v1', spec: crossConnect, quantity: 2 },
        {
          name: 'contract-acme-1-fee-1',
          spec: { ...crossConnect, amount: '250.00', basedOn: 'cross-connect-v1' },
        },
      ]
    );
    const rows = listFeeRowsFromOffer(options, current);
    expect(rows.find((r) => r.name === 'cross-connect-v1')).toMatchObject({
      selected: true,
      custom: false,
      quantity: '2',
    });
    expect([...listFeeNames(rows)]).toEqual(['cross-connect-v1']);
  });
});

describe('buildListFeePlan', () => {
  it('refers to the list fee when its amount is kept', () => {
    const plan = buildListFeePlan(
      [row('cross-connect-v1', { quantity: '4', discount: '10', custom: true, amount: '300' })],
      options
    );
    expect(plan).toEqual([
      {
        label: 'Cross connect',
        chargeType: 'Recurring',
        amount: '300.00',
        quantity: 4,
        pricingUnit: 'port',
        serviceRef: 'bare-metal.datumapis.com',
        discount: 10,
        interval: 'monthly',
        billingTiming: 'InArrears',
        existingPricing: 'cross-connect-v1',
      },
    ]);
  });

  it("gives a recurring fee the row's timing and the list fee's interval, a one-time fee neither", () => {
    const quarterly = listFeeOptions([
      pricing('maintenance-v1', { ...crossConnect, interval: 'quarterly' }),
      pricing('rack-install-v1', install),
    ]);
    const plan = buildListFeePlan(
      [
        row('rack-install-v1', { billingTiming: 'InAdvance' }),
        row('maintenance-v1', { billingTiming: 'InAdvance' }),
      ],
      quarterly
    );
    expect(plan.find((fee) => fee.label === 'Cross connect')).toMatchObject({
      interval: 'quarterly',
      billingTiming: 'InAdvance',
    });
    const oneTime = plan.find((fee) => fee.chargeType === 'OneTime');
    expect(oneTime?.interval).toBeUndefined();
    expect(oneTime?.billingTiming).toBeUndefined();
  });

  it("creates a customer fee based on the list one for the customer's own amount", () => {
    const [fee] = buildListFeePlan(
      [row('cross-connect-v1', { quantity: '4', custom: true, amount: '250' })],
      options
    );
    expect(fee).toMatchObject({ amount: '250.00', quantity: 4, basedOn: 'cross-connect-v1' });
    expect(fee.existingPricing).toBeUndefined();
  });

  it("reuses the contract's customer fee when its amount is kept", () => {
    const current = offer(
      [{ name: 'contract-acme-1-fee-1' }],
      [
        {
          name: 'contract-acme-1-fee-1',
          spec: { ...crossConnect, amount: '250.00', basedOn: 'cross-connect-v1' },
        },
      ]
    );
    const [fee] = buildListFeePlan(
      [
        row('cross-connect-v1', {
          quantity: '6',
          custom: true,
          amount: '250.00',
          currentPricing: 'contract-acme-1-fee-1',
        }),
      ],
      options,
      current
    );
    expect(fee).toMatchObject({ existingPricing: 'contract-acme-1-fee-1', quantity: 6 });
    expect(fee.basedOn).toBeUndefined();
  });

  it('leaves out rows not ticked', () => {
    expect(buildListFeePlan([row('rack-install-v1', { selected: false })], options)).toEqual([]);
  });
});

describe('list fees on the Offer', () => {
  it('carry their quantity and discount on the reference', () => {
    expect(
      contractOfferPlan({
        namespace: 'milo-system',
        fees: [{ name: 'cross-connect-v1', chargeType: 'Recurring', quantity: 4, discount: 10 }],
        usageRefs: [],
      }).servicePricingRefs
    ).toEqual([
      {
        name: 'cross-connect-v1',
        namespace: 'milo-system',
        quantity: 4,
        discount: { percentage: 10 },
      },
    ]);
  });

  it("show the list fee a customer's own fee is based on, and its discount", () => {
    const [fee] = getContractFees(
      offer(
        [],
        [
          {
            name: 'contract-acme-1-fee-1',
            spec: { ...crossConnect, amount: '250.00', basedOn: 'cross-connect-v1' },
            discount: { percentage: 5 },
          },
        ]
      )
    );
    expect(fee).toMatchObject({ basedOn: 'cross-connect-v1', discount: 5, amount: 250 });
  });
});

describe('list fee renewals', () => {
  it("start from the offer's reference, and go on the plan", () => {
    const current = offer(
      [{ name: 'cross-connect-v1', periods: 36 }],
      [{ name: 'cross-connect-v1', spec: crossConnect }]
    );
    const rows = listFeeRowsFromOffer(options, current);
    expect(rows[1]).toMatchObject({ selected: true, periods: '36' });
    const [fee] = buildListFeePlan([rows[1]], options);
    expect(fee.periods).toBe(36);
    expect(buildListFeePlan([{ ...rows[1], periods: '' }], options)[0].periods).toBeUndefined();
  });
});
