import { getEntitlementActiveSince, getOfferPricingCount, getOfferServices } from './offer-summary';
import type {
  ComMiloapisBillingV1Alpha1BillingEntitlement,
  ComMiloapisBillingV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';
import type { ComMiloapisServicesV1Alpha1Service } from '@openapi/services.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

type Snapshot = NonNullable<
  NonNullable<ComMiloapisBillingV1Alpha1Offer['spec']>['servicePricings']
>[number];

const snapshot = (name: string, serviceRef: string): Snapshot => ({
  name,
  spec: { chargeType: 'Usage', currency: 'USD', serviceRef },
});

const offer = (spec: Partial<NonNullable<ComMiloapisBillingV1Alpha1Offer['spec']>>) =>
  ({
    metadata: { name: 'free-compute' },
    spec: { chargeTypes: ['Usage'], launchStage: 'GA', ...spec },
  }) as ComMiloapisBillingV1Alpha1Offer;

const services = new Map<string, ComMiloapisServicesV1Alpha1Service>([
  [
    'compute.miloapis.com',
    {
      metadata: { name: 'compute' },
      spec: { serviceName: 'compute.miloapis.com', displayName: 'Compute' },
    } as ComMiloapisServicesV1Alpha1Service,
  ],
]);

describe('getOfferServices', () => {
  it('groups prices by service, in name order', () => {
    const result = getOfferServices(
      offer({
        servicePricings: [
          snapshot('cpu', 'compute.miloapis.com'),
          snapshot('egress', 'networking.miloapis.com'),
          snapshot('memory', 'compute.miloapis.com'),
        ],
      }),
      services
    );
    expect(result.map(({ displayName, pricingCount }) => [displayName, pricingCount])).toEqual([
      ['Compute', 2],
      ['Networking', 1],
    ]);
  });

  it('is empty without snapshots', () => {
    expect(getOfferServices(offer({}), services)).toEqual([]);
  });
});

describe('getOfferPricingCount', () => {
  it('counts snapshots, then refs', () => {
    expect(getOfferPricingCount(offer({ servicePricings: [snapshot('a', 'x')] }))).toBe(1);
    expect(
      getOfferPricingCount(offer({ servicePricingRefs: [{ name: 'a' }, { name: 'b' }] }))
    ).toBe(2);
    expect(getOfferPricingCount(offer({}))).toBe(0);
  });
});

describe('getEntitlementActiveSince', () => {
  const entitlement = (status: 'True' | 'False'): ComMiloapisBillingV1Alpha1BillingEntitlement => ({
    spec: { billingAccountRef: { name: 'ba' }, offerRef: { name: 'free-compute' } },
    status: {
      conditions: [
        {
          type: 'Ready',
          status,
          reason: 'Reconciled',
          message: '',
          lastTransitionTime: '2026-07-09T15:44:00Z',
        },
      ],
    },
  });

  it('is the Ready transition time while Ready', () => {
    expect(getEntitlementActiveSince(entitlement('True'))).toBe('2026-07-09T15:44:00Z');
  });

  it('is undefined while not Ready', () => {
    expect(getEntitlementActiveSince(entitlement('False'))).toBeUndefined();
  });
});
