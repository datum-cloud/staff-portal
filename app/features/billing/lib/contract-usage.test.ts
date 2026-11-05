import {
  buildUsagePlan,
  listUsageMeterOptions,
  rateSlots,
  usageRowsFromOffer,
  withRateAmounts,
} from './contract-usage';
import type {
  ComMiloapisBillingV1Alpha1Offer,
  ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

type Pricing = ComMiloapisBillingV1Alpha1ServicePricing;
type Spec = NonNullable<Pricing['spec']>;

const cpuSpec = (flat: string): Spec => ({
  chargeType: 'Usage',
  currency: 'USD',
  serviceRef: 'compute.datumapis.com',
  displayName: 'Compute vCPU',
  metric: 'compute.datumapis.com/instance/milli-cpu-seconds',
  pricingUnit: 'vcpu-second',
  rates: [{ match: { dimension: 'runtime_class', value: 'general-purpose' }, flat }, { flat }],
});

const egressSpec: Spec = {
  chargeType: 'Usage',
  currency: 'USD',
  serviceRef: 'networking.datumapis.com',
  displayName: 'Egress',
  metric: 'networking.datumapis.com/egress-bytes',
  pricingUnit: 'gib',
  rates: [{ tiered: [{ upTo: '100', rate: '0' }, { rate: '0.05' }] }],
};

const pricing = (name: string, spec: Spec, created: string, labels?: Record<string, string>) =>
  ({
    metadata: { name, creationTimestamp: created, labels },
    spec,
  }) as Pricing;

const pricings = [
  pricing('compute-vcpu-v1', cpuSpec('0.000014'), '2026-10-01T00:00:00Z'),
  pricing('compute-vcpu-v2', cpuSpec('0.000013'), '2026-10-20T00:00:00Z'),
  pricing('networking-egress-v1', egressSpec, '2026-10-01T00:00:00Z'),
  pricing(
    'contract-acme-1-usage-1',
    { ...cpuSpec('0.00001'), basedOn: 'compute-vcpu-v2' },
    '2026-11-01T00:00:00Z',
    { 'billing.miloapis.com/contract-billing-account': 'acme' }
  ),
  pricing(
    'setup',
    { chargeType: 'OneTime', currency: 'USD', amount: '10' },
    '2026-10-01T00:00:00Z'
  ),
];

const options = listUsageMeterOptions(pricings);

const offer = (
  refs: { name: string; discount?: { percentage: number } }[],
  snapshots: { name: string; spec: Spec }[]
) =>
  ({
    metadata: { name: 'contract-acme-1' },
    spec: {
      chargeTypes: ['Usage'],
      launchStage: 'GA',
      servicePricingRefs: refs.map((r) => ({ ...r, namespace: 'milo-system' })),
      servicePricings: snapshots,
    },
  }) as ComMiloapisBillingV1Alpha1Offer;

describe('listUsageMeterOptions', () => {
  it('lists list pricings by meter, newest first, leaving out customer pricings and fees', () => {
    expect(options.map((o) => [o.serviceRef, o.pricings.map((p) => p.metadata?.name)])).toEqual([
      ['compute.datumapis.com', ['compute-vcpu-v2', 'compute-vcpu-v1']],
      ['networking.datumapis.com', ['networking-egress-v1']],
    ]);
  });
});

describe('rate slots', () => {
  it('has one slot per flat rate and per tier band', () => {
    expect(rateSlots(cpuSpec('0.000014'))).toEqual([
      { label: 'runtime_class general-purpose', listAmount: '0.000014' },
      { label: 'everything else', listAmount: '0.000014' },
    ]);
    expect(rateSlots(egressSpec)).toEqual([
      { label: 'up to 100', listAmount: '0' },
      { label: 'over 100', listAmount: '0.05' },
    ]);
  });

  it('replaces only the amounts', () => {
    expect(withRateAmounts(egressSpec.rates, ['0', '0.04'])).toEqual([
      { tiered: [{ upTo: '100', rate: '0' }, { rate: '0.04' }] },
    ]);
  });
});

describe('usage rows', () => {
  it("start from an offer's list pricings and discounts", () => {
    const rows = usageRowsFromOffer(
      options,
      offer([{ name: 'compute-vcpu-v1', discount: { percentage: 10 } }], [])
    );
    expect(rows[0]).toMatchObject({
      selected: true,
      pricingName: 'compute-vcpu-v1',
      discount: '10',
      custom: false,
    });
    expect(rows[1]).toMatchObject({ selected: false, pricingName: 'networking-egress-v1' });
  });

  it("pick up the customer's own rates from the pricing they're based on", () => {
    const rows = usageRowsFromOffer(
      options,
      offer(
        [{ name: 'contract-acme-1-usage-1' }],
        [
          {
            name: 'contract-acme-1-usage-1',
            spec: { ...cpuSpec('0.00001'), basedOn: 'compute-vcpu-v2' },
          },
        ]
      )
    );
    expect(rows[0]).toMatchObject({
      selected: true,
      pricingName: 'compute-vcpu-v2',
      custom: true,
      amounts: ['0.00001', '0.00001'],
      currentPricing: 'contract-acme-1-usage-1',
    });
  });
});

describe('buildUsagePlan', () => {
  const base = usageRowsFromOffer(options, null);

  it('refers to list pricings, with discounts', () => {
    const rows = [{ ...base[0], selected: true, discount: '15' }, base[1]];
    expect(buildUsagePlan(rows, options, 'milo-system')).toEqual({
      refs: [{ name: 'compute-vcpu-v2', namespace: 'milo-system', discount: { percentage: 15 } }],
      create: [],
    });
  });

  it("creates a customer pricing for the customer's own rates", () => {
    const rows = [base[0], { ...base[1], selected: true, custom: true, amounts: ['0', '0.04'] }];
    const plan = buildUsagePlan(rows, options, 'milo-system');
    expect(plan.refs).toEqual([{ name: '', namespace: 'milo-system' }]);
    expect(plan.create).toEqual([
      {
        index: 0,
        basedOn: 'networking-egress-v1',
        discount: undefined,
        spec: {
          ...egressSpec,
          basedOn: 'networking-egress-v1',
          rates: [{ tiered: [{ upTo: '100', rate: '0' }, { rate: '0.04' }] }],
        },
      },
    ]);
  });

  it('uses the list pricing when the rates are left as they are', () => {
    const rows = [{ ...base[0], selected: true, custom: true }];
    expect(buildUsagePlan(rows, options, 'milo-system').create).toEqual([]);
  });

  it("reuses the contract's customer pricing when its rates are kept", () => {
    const current = offer(
      [{ name: 'contract-acme-1-usage-1' }],
      [
        {
          name: 'contract-acme-1-usage-1',
          spec: { ...cpuSpec('0.00001'), basedOn: 'compute-vcpu-v2' },
        },
      ]
    );
    const rows = usageRowsFromOffer(options, current);
    expect(buildUsagePlan(rows, options, 'milo-system', current)).toEqual({
      refs: [{ name: 'contract-acme-1-usage-1', namespace: 'milo-system' }],
      create: [],
    });
  });
});
