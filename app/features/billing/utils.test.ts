import {
  describeServicePricingRates,
  getServicePricingsForService,
  summarizeServicePricing,
} from './utils';
import type { ComMiloapisBillingV1Alpha1ServicePricing } from '@openapi/billing.miloapis.com/v1alpha1';
import type { ComMiloapisServicesV1Alpha1Service } from '@openapi/services.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

const pricing = (
  name: string,
  serviceRef: string,
  displayName?: string
): ComMiloapisBillingV1Alpha1ServicePricing =>
  ({
    metadata: { name, namespace: 'milo-system' },
    spec: { chargeType: 'Usage', serviceRef, currency: 'USD', displayName },
  }) as ComMiloapisBillingV1Alpha1ServicePricing;

const networking = {
  metadata: { name: 'networking-datumapis-com' },
  spec: { serviceName: 'networking.datumapis.com' },
} as ComMiloapisServicesV1Alpha1Service;

describe('getServicePricingsForService', () => {
  it("keeps the service's pricings, sorted by display name", () => {
    const got = getServicePricingsForService(
      [
        pricing('networking-alb-requests-v1', 'networking.datumapis.com', 'ALB Requests'),
        pricing('compute-vcpu-v1', 'compute.datumapis.com', 'Compute vCPU'),
        pricing('networking-alb-egress-v1', 'networking.datumapis.com', 'ALB Egress'),
      ],
      networking
    );
    expect(got.map((p) => p.metadata?.name)).toEqual([
      'networking-alb-egress-v1',
      'networking-alb-requests-v1',
    ]);
  });

  it('returns nothing when no pricing names the service', () => {
    expect(
      getServicePricingsForService(
        [pricing('compute-vcpu-v1', 'compute.datumapis.com')],
        networking
      )
    ).toEqual([]);
  });
});

const usage = (
  pricingUnit: string,
  rates: NonNullable<ComMiloapisBillingV1Alpha1ServicePricing['spec']>['rates']
): ComMiloapisBillingV1Alpha1ServicePricing =>
  ({
    metadata: { name: 'test-v1', namespace: 'milo-system' },
    spec: {
      chargeType: 'Usage',
      serviceRef: 'x.datumapis.com',
      currency: 'USD',
      pricingUnit,
      rates,
    },
  }) as ComMiloapisBillingV1Alpha1ServicePricing;

const egressTiers = [
  { upTo: '200', rate: '0' },
  { upTo: '10240', rate: '0.05' },
  { upTo: '153600', rate: '0.04' },
  { rate: '0.03' },
];

describe('describeServicePricingRates', () => {
  it('lists every tier with its range', () => {
    expect(describeServicePricingRates(usage('GB', [{ tiered: egressTiers }]))).toEqual([
      {
        label: undefined,
        prices: [
          'First 200 GB: $0 / GB',
          '200–10,240 GB: $0.05 / GB',
          '10,240–153,600 GB: $0.04 / GB',
          'Over 153,600 GB: $0.03 / GB',
        ],
      },
    ]);
  });

  it('labels matched rates and the catch-all', () => {
    expect(
      describeServicePricingRates(
        usage('vcpu-second', [
          { match: { dimension: 'runtime_class', value: 'general-purpose' }, flat: '0.000014' },
          { flat: '0.000014' },
        ])
      )
    ).toEqual([
      { label: 'runtime_class = general-purpose', prices: ['$0.000014 / vcpu-second'] },
      { label: 'Everything else', prices: ['$0.000014 / vcpu-second'] },
    ]);
  });

  it('shows a fixed charge as one price', () => {
    const fee = {
      metadata: { name: 'fee-v1' },
      spec: {
        chargeType: 'Recurring',
        serviceRef: 'x.datumapis.com',
        currency: 'USD',
        amount: '10.00',
        interval: 'monthly',
      },
    } as ComMiloapisBillingV1Alpha1ServicePricing;
    expect(describeServicePricingRates(fee)).toEqual([{ prices: ['$10.00 / month'] }]);
  });
});

describe('summarizeServicePricing', () => {
  it('shows the price range of a tiered rate', () => {
    expect(summarizeServicePricing(usage('GB', [{ tiered: egressTiers }]))).toBe(
      '$0–$0.05 / GB (4 tiers)'
    );
  });
});
