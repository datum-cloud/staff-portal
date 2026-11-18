import { getOfferOverrides } from './offer-overrides';
import type {
  ComMiloapisBillingV1Alpha1Offer,
  ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

type Pricing = ComMiloapisBillingV1Alpha1ServicePricing;
type Spec = NonNullable<Pricing['spec']>;

const pricing = (name: string, spec: Spec) => ({ metadata: { name }, spec }) as Pricing;

const crossConnect: Spec = {
  chargeType: 'Recurring',
  currency: 'USD',
  displayName: 'Cross connect',
  amount: '300.00',
  interval: 'monthly',
  pricingUnit: 'port',
};
const vcpu: Spec = {
  chargeType: 'Usage',
  currency: 'USD',
  displayName: 'Compute vCPU',
  metric: 'compute.datumapis.com/vcpu',
  pricingUnit: 'vcpu-second',
  rates: [{ tiered: [{ upTo: '100', rate: '0.000014' }, { rate: '0.000012' }] }] as Spec['rates'],
};
const list = [pricing('cross-connect-v1', crossConnect), pricing('compute-vcpu-v1', vcpu)];

const offer = (
  snapshots: { name: string; spec: Spec; discount?: { percentage: number } }[],
  refs: { name: string; discount?: { percentage: number } }[]
) =>
  ({
    metadata: { name: 'contract-acme-1' },
    spec: {
      chargeTypes: ['Recurring', 'Usage'],
      launchStage: 'GA',
      servicePricingRefs: refs.map((ref) => ({ ...ref, namespace: 'milo-system' })),
      servicePricings: snapshots,
    },
  }) as ComMiloapisBillingV1Alpha1Offer;

describe('getOfferOverrides', () => {
  it("lists a customer's own fee amount beside the list amount", () => {
    const own = { ...crossConnect, amount: '250.00', basedOn: 'cross-connect-v1' };
    expect(
      getOfferOverrides(offer([{ name: 'fee-1', spec: own }], [{ name: 'fee-1' }]), list)
    ).toEqual([
      {
        name: 'fee-1',
        label: 'Cross connect',
        chargeType: 'Recurring',
        pricingUnit: 'port',
        interval: 'monthly',
        discount: undefined,
        fee: { amount: '250.00', listAmount: '300.00' },
      },
    ]);
  });

  it("lists only the customer's usage rates that differ from the list", () => {
    const own: Spec = {
      ...vcpu,
      basedOn: 'compute-vcpu-v1',
      rates: [
        { tiered: [{ upTo: '100', rate: '0.00001' }, { rate: '0.000012' }] },
      ] as Spec['rates'],
    };
    const [override] = getOfferOverrides(
      offer([{ name: 'usage-1', spec: own }], [{ name: 'usage-1' }]),
      list
    );
    expect(override.rates).toEqual([
      { label: { band: { upTo: '100' } }, amount: '0.00001', listAmount: '0.000014' },
    ]);
  });

  it("lists a discount on one pricing, but not the Offer's own discount copied into snapshots", () => {
    const overrides = getOfferOverrides(
      offer(
        [
          { name: 'cross-connect-v1', spec: crossConnect, discount: { percentage: 10 } },
          { name: 'compute-vcpu-v1', spec: vcpu, discount: { percentage: 5 } },
        ],
        [{ name: 'cross-connect-v1', discount: { percentage: 10 } }, { name: 'compute-vcpu-v1' }]
      ),
      list
    );
    expect(overrides.map((o) => [o.name, o.discount])).toEqual([['cross-connect-v1', 10]]);
  });

  it('leaves out list prices billed as they are and fees made for the contract', () => {
    const setup: Spec = { chargeType: 'OneTime', currency: 'USD', amount: '500.00' };
    expect(
      getOfferOverrides(
        offer(
          [
            { name: 'cross-connect-v1', spec: crossConnect },
            { name: 'fee-1', spec: setup },
          ],
          [{ name: 'cross-connect-v1' }, { name: 'fee-1' }]
        ),
        list
      )
    ).toEqual([]);
  });
});
