import {
  CONTRACT_STARTED_ANNOTATION,
  OFFER_CHANGE_AT_ANNOTATION,
  contractOfferPlan,
  contractResourceNames,
  contractStartFromDate,
  contractStartProblem,
  discountedFeeTotal,
  discountText,
  firstInvoiceTotal,
  firstMonthShare,
  firstPeriodEnd,
  getContractFees,
  getContractFirstInvoice,
  getContractState,
  getUsagePricingRefs,
  isContractResource,
  localDateForUtcDay,
  MAX_CONTRACT_FEES,
  monthlyTotal,
  parseAmount,
  parseDiscount,
  proratedFirstInvoiceTotal,
  toPricingAmount,
} from './contract';
import type {
  ComMiloapisBillingV1Alpha1BillingEntitlement,
  ComMiloapisBillingV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

type Snapshot = NonNullable<
  NonNullable<ComMiloapisBillingV1Alpha1Offer['spec']>['servicePricings']
>[number];

const now = new Date('2026-11-03T15:04:05Z');

type ServicePricingRef = NonNullable<
  NonNullable<ComMiloapisBillingV1Alpha1Offer['spec']>['servicePricingRefs']
>[number];

const offer = (
  servicePricings: Snapshot[],
  refs: ServicePricingRef[] = servicePricings.map((s) => ({
    name: s.name,
    namespace: 'milo-system',
  }))
) =>
  ({
    metadata: { name: 'contract' },
    spec: {
      chargeTypes: [...new Set(servicePricings.map((s) => s.spec.chargeType))],
      launchStage: 'GA',
      servicePricingRefs: refs,
      servicePricings,
    },
  }) as ComMiloapisBillingV1Alpha1Offer;

const fixed = (
  name: string,
  chargeType: 'OneTime' | 'Recurring',
  amount: string,
  displayName?: string
): Snapshot => ({
  name,
  spec: { chargeType, currency: 'USD', serviceRef: 'bare-metal.miloapis.com', amount, displayName },
});

const usage = (name: string): Snapshot => ({
  name,
  spec: { chargeType: 'Usage', currency: 'USD', serviceRef: 'compute.miloapis.com' },
});

const entitlement = (
  startsAt: string | undefined,
  extra: Partial<ComMiloapisBillingV1Alpha1BillingEntitlement> = {}
) =>
  ({
    metadata: { name: 'acme', ...extra.metadata },
    spec: {
      billingAccountRef: { name: 'acme' },
      offerRef: { name: 'contract' },
      ...(startsAt ? { contract: { startsAt } } : {}),
    },
    status: extra.status,
  }) as ComMiloapisBillingV1Alpha1BillingEntitlement;

describe('discounts', () => {
  it("reads a typed discount, and shows a ref's", () => {
    expect(parseDiscount('25')).toBe(25);
    expect(parseDiscount('0')).toBeUndefined();
    expect(parseDiscount('')).toBeUndefined();
    expect(discountText(25)).toBe('25');
    expect(discountText(undefined)).toBe('');
  });

  it("takes a fee's discount off its total, to the cent", () => {
    expect(discountedFeeTotal({ chargeType: 'Recurring', amount: 300, quantity: 4 })).toBe(1200);
    expect(
      discountedFeeTotal({ chargeType: 'Recurring', amount: 300, quantity: 4, discount: 25 })
    ).toBe(900);
    expect(discountedFeeTotal({ chargeType: 'OneTime', amount: 99.99, discount: 33 })).toBe(66.99);
  });
});

describe('isContractResource', () => {
  it('spots contract offers and fees by label or name', () => {
    expect(
      isContractResource({
        metadata: {
          name: 'acme-fees',
          labels: { 'billing.miloapis.com/contract-billing-account': 'acme' },
        },
      })
    ).toBe(true);
    expect(isContractResource({ metadata: { name: 'contract-acme-20261103-fee-1' } })).toBe(true);
    expect(isContractResource({ metadata: { name: 'payg' } })).toBe(false);
    expect(isContractResource({})).toBe(false);
  });
});

describe('contractStartFromDate', () => {
  it('keeps the calendar day picked, at midnight UTC', () => {
    // A local midnight anywhere in the world is still 18 November.
    expect(contractStartFromDate(new Date(2026, 10, 18)).toISOString()).toBe(
      '2026-11-18T00:00:00.000Z'
    );
  });
});

describe('localDateForUtcDay', () => {
  it('shows the UTC calendar day in the browser, and maps back to it', () => {
    const utcDay = new Date('2026-11-18T00:00:00Z');
    const local = localDateForUtcDay(utcDay);
    expect([local.getFullYear(), local.getMonth(), local.getDate()]).toEqual([2026, 10, 18]);
    expect(contractStartFromDate(local).toISOString()).toBe(utcDay.toISOString());
  });
});

describe('contractStartProblem', () => {
  it('accepts today and up to a year ahead', () => {
    expect(contractStartProblem(new Date('2026-11-03T00:00:00Z'), now)).toBeNull();
    expect(contractStartProblem(new Date('2027-11-03T00:00:00Z'), now)).toBeNull();
  });

  it('refuses yesterday and more than a year ahead', () => {
    expect(contractStartProblem(new Date('2026-11-02T00:00:00Z'), now)).toBe('past');
    expect(contractStartProblem(new Date('2027-11-06T00:00:00Z'), now)).toBe('too-far');
  });
});

describe('getContractState', () => {
  it('is null without a contract', () => {
    expect(getContractState(entitlement(undefined), now)).toBeNull();
    expect(getContractState(null, now)).toBeNull();
  });

  it('has not started before its start date', () => {
    const state = getContractState(entitlement('2026-12-01T00:00:00Z'), now);
    expect(state?.started).toBe(false);
    expect(state?.startsAt.toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('has started once the provider says so, or its day has come', () => {
    expect(getContractState(entitlement('2026-11-03T00:00:00Z'), now)?.started).toBe(true);
    const marked = entitlement('2026-12-01T00:00:00Z', {
      metadata: { annotations: { [CONTRACT_STARTED_ANNOTATION]: '2026-12-01T00:00:00Z' } },
    });
    expect(getContractState(marked, now)?.started).toBe(true);
  });

  it('reports a scheduled amendment only while the provider holds it', () => {
    const scheduled = entitlement('2026-10-18T00:00:00Z', {
      metadata: { annotations: { [OFFER_CHANGE_AT_ANNOTATION]: '2026-11-18T00:00:00Z' } },
      status: {
        conditions: [
          {
            type: 'OpenMeterSubscriptionSynced',
            status: 'True',
            reason: 'OfferChangeScheduled',
            message: '',
            lastTransitionTime: '2026-11-03T00:00:00Z',
          },
        ],
      },
    });
    expect(getContractState(scheduled, now)?.changeAt?.toISOString()).toBe(
      '2026-11-18T00:00:00.000Z'
    );

    const done = { ...scheduled, status: { conditions: [] } };
    expect(getContractState(done, now)?.changeAt).toBeUndefined();
  });
});

describe('getContractFees', () => {
  it('lists the fixed fees, setup fee first, without usage', () => {
    const fees = getContractFees(
      offer([
        fixed('monthly', 'Recurring', '1000.00', 'Dedicated server'),
        usage('cpu'),
        fixed('setup', 'OneTime', '1500.00'),
      ])
    );
    expect(fees.map((f) => [f.name, f.label, f.amount, f.quantity])).toEqual([
      ['setup', 'setup', 1500, 1],
      ['monthly', 'Dedicated server', 1000, 1],
    ]);
  });

  it("reads each fee's quantity, unit and service, if any", () => {
    const ports = fixed('ports', 'Recurring', '300.00', 'Cross connect');
    ports.quantity = 4;
    ports.spec.pricingUnit = 'port';
    delete ports.spec.serviceRef;
    const [fee] = getContractFees(offer([ports]));
    expect(fee).toMatchObject({ amount: 300, quantity: 4, pricingUnit: 'port' });
    expect(fee.serviceRef).toBeUndefined();
  });
});

describe('getUsagePricingRefs', () => {
  it('keeps the usage refs with their discounts', () => {
    const refs = getUsagePricingRefs(
      offer(
        [usage('cpu'), fixed('setup', 'OneTime', '10')],
        [
          { name: 'cpu', namespace: 'milo-system', discount: { percentage: 10 } },
          { name: 'setup', namespace: 'milo-system' },
        ]
      )
    );
    expect(refs).toEqual([{ name: 'cpu', namespace: 'milo-system', discount: { percentage: 10 } }]);
  });
});

describe('contractOfferPlan', () => {
  const usageRefs = [{ name: 'cpu', namespace: 'milo-system' }];

  it('bundles the fees in order and, when asked, usage', () => {
    expect(
      contractOfferPlan({
        namespace: 'milo-system',
        fees: [
          { name: 'servers', chargeType: 'Recurring' },
          { name: 'install', chargeType: 'OneTime' },
          { name: 'compute', chargeType: 'Recurring' },
        ],
        usageRefs,
      })
    ).toEqual({
      chargeTypes: ['OneTime', 'Recurring', 'Usage'],
      servicePricingRefs: [
        { name: 'servers', namespace: 'milo-system' },
        { name: 'install', namespace: 'milo-system' },
        { name: 'compute', namespace: 'milo-system' },
        { name: 'cpu', namespace: 'milo-system' },
      ],
    });
  });

  it('sets a quantity on fees charged more than once', () => {
    const plan = contractOfferPlan({
      namespace: 'milo-system',
      fees: [
        { name: 'servers', chargeType: 'Recurring', quantity: 3 },
        { name: 'support', chargeType: 'Recurring', quantity: 1 },
      ],
      usageRefs: [],
    });
    expect(plan.servicePricingRefs).toEqual([
      { name: 'servers', namespace: 'milo-system', quantity: 3 },
      { name: 'support', namespace: 'milo-system' },
    ]);
  });

  it('lists only the charge types it has', () => {
    const plan = contractOfferPlan({
      namespace: 'milo-system',
      fees: [{ name: 'servers', chargeType: 'Recurring' }],
      usageRefs: [],
    });
    expect(plan.chargeTypes).toEqual(['Recurring']);
  });
});

describe('contractResourceNames', () => {
  it('derives valid, unique names from the account', () => {
    const names = contractResourceNames('Acme_Corp.Billing', now);
    expect(names.offer).toBe('contract-acme-corp-billing-20261103150405');
    expect(names.fee(0)).toBe('contract-acme-corp-billing-20261103150405-fee-1');
  });

  it('keeps long account names within 63 characters', () => {
    const { fee } = contractResourceNames('a'.repeat(80), now);
    expect(fee(MAX_CONTRACT_FEES - 1).length).toBeLessThanOrEqual(63);
  });
});

describe('first month proration', () => {
  it('matches what OpenMeter charged for a contract set up on its start day', () => {
    const startsAt = new Date('2026-11-03T00:00:00Z');
    const share = firstMonthShare(startsAt, new Date('2026-11-03T14:33:42Z'));
    const fees = [
      { chargeType: 'OneTime' as const, amount: 20000 },
      { chargeType: 'Recurring' as const, amount: 2000 },
    ];
    expect(proratedFirstInvoiceTotal(fees, share)).toBe(21959.55);
  });

  it('charges a full month when the account starts on it at midnight', () => {
    const startsAt = new Date('2026-12-01T00:00:00Z');
    expect(firstMonthShare(startsAt, new Date('2026-11-20T10:00:00Z'))).toBe(1);
  });

  it('ends the first period on the last day of a shorter month', () => {
    expect(firstPeriodEnd(new Date('2027-01-31T00:00:00Z')).toISOString()).toBe(
      '2027-02-28T00:00:00.000Z'
    );
    expect(firstPeriodEnd(new Date('2026-11-03T00:00:00Z')).toISOString()).toBe(
      '2026-12-03T00:00:00.000Z'
    );
  });
});

describe('getContractFirstInvoice', () => {
  const invoice = (name: string, created: string, total: string) =>
    ({ metadata: { name, creationTimestamp: created }, status: { total } }) as never;

  it('finds the first invoice with something to pay since the start', () => {
    const first = getContractFirstInvoice(
      [
        invoice('old-card-invoice', '2026-11-01T00:05:00Z', '120.00'),
        invoice('usage-tail', '2026-11-03T15:40:00Z', '0.00'),
        invoice('second-month', '2026-12-03T00:10:00Z', '2000.00'),
        invoice('first', '2026-11-03T14:43:42Z', '21959.55'),
      ],
      new Date('2026-11-03T00:00:00Z')
    );
    expect(first?.metadata?.name).toBe('first');
  });

  it('is undefined until it arrives', () => {
    expect(getContractFirstInvoice([], new Date('2026-11-03T00:00:00Z'))).toBeUndefined();
  });
});

describe('amounts', () => {
  it('parses what staff type', () => {
    expect(parseAmount('1,500.00')).toBe(1500);
    expect(parseAmount('$1000')).toBe(1000);
    expect(parseAmount('12.345')).toBeNaN();
    expect(parseAmount('')).toBeNaN();
    expect(parseAmount('-5')).toBeNaN();
  });

  it('formats pricing amounts and totals the invoices', () => {
    expect(toPricingAmount(1500)).toBe('1500.00');
    const fees = [
      { chargeType: 'OneTime' as const, amount: 1500 },
      { chargeType: 'Recurring' as const, amount: 1000 },
      { chargeType: 'Recurring' as const, amount: 500.5 },
      { chargeType: 'Recurring' as const, amount: Number.NaN },
    ];
    expect(firstInvoiceTotal(fees)).toBe(3000.5);
    expect(monthlyTotal(fees)).toBe(1500.5);
  });

  it('charges each fee its amount times its quantity', () => {
    const fees = [
      { chargeType: 'OneTime' as const, amount: 1500, quantity: 2 },
      { chargeType: 'Recurring' as const, amount: 300, quantity: 4 },
    ];
    expect(firstInvoiceTotal(fees)).toBe(4200);
    expect(monthlyTotal(fees)).toBe(1200);
    expect(proratedFirstInvoiceTotal(fees, 0.5)).toBe(3600);
  });
});
