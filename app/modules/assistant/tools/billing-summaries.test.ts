import {
  summarizeAccountStanding,
  summarizeApplication,
  summarizeArrangement,
  summarizeEntitlement,
  summarizeInvoice,
  summarizeOffer,
  summarizeUsage,
} from './billing-summaries';
import type { OrgUsageDashboardData } from '@/modules/billing/usage.types';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingArrangement,
  ComMiloapisBillingV1Alpha1BillingArrangementApplication,
  ComMiloapisBillingV1Alpha1BillingEntitlement,
  ComMiloapisBillingV1Alpha1Invoice,
  ComMiloapisBillingV1Alpha1Offer,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

const now = new Date('2026-11-20T12:00:00Z');

describe('summarizeAccountStanding', () => {
  it('reports payment, invoicing and terms', () => {
    const account = {
      status: {
        conditions: [
          { type: 'PaymentReady', status: 'True', reason: 'InvoiceTerms', message: 'Terms' },
          { type: 'InvoicingReady', status: 'False', reason: 'PastDue', message: 'Overdue' },
        ],
        paymentArrangement: {
          name: 'acme-terms',
          type: 'Invoice',
          invoice: { netDays: 45, creditLimit: '5000' },
        },
      },
    } as unknown as ComMiloapisBillingV1Alpha1BillingAccount;
    expect(summarizeAccountStanding(account)).toEqual({
      payment: { status: 'True', reason: 'InvoiceTerms', message: 'Terms' },
      invoicing: { status: 'False', reason: 'PastDue', message: 'Overdue' },
      paymentTerms: {
        type: 'Invoice',
        netDays: 45,
        creditLimit: '5000',
        startsAt: null,
        endsAt: null,
      },
    });
  });

  it('is empty for an account billing has not reconciled', () => {
    expect(summarizeAccountStanding({} as ComMiloapisBillingV1Alpha1BillingAccount)).toEqual({
      payment: null,
      invoicing: null,
      paymentTerms: null,
    });
  });
});

describe('summarizeInvoice', () => {
  it('says how overdue a past-due invoice is and what is owed', () => {
    const invoice = {
      metadata: { name: 'acme-2026-10-abc' },
      spec: {
        billingAccountRef: { name: 'acme' },
        period: { start: '2026-10-01T00:00:00Z', end: '2026-10-31T23:59:59Z' },
      },
      status: {
        phase: 'PastDue',
        currencyCode: 'USD',
        total: '1200.00',
        amountDue: '1200.00',
        dueDate: '2026-11-10T00:00:00Z',
      },
    } as unknown as ComMiloapisBillingV1Alpha1Invoice;
    const summary = summarizeInvoice(invoice, now);
    expect(summary).toMatchObject({
      name: 'acme-2026-10-abc',
      billingAccountName: 'acme',
      phase: 'PastDue',
      amountDue: 1200,
      dueDate: '2026-11-10T00:00:00Z',
    });
    expect(summary.daysOverdue).toBe(10);
  });
});

describe('summarizeArrangement', () => {
  it('keeps the terms and whether they are in effect', () => {
    const arrangement = {
      metadata: { name: 'acme-terms' },
      spec: {
        billingAccountRef: { name: 'acme' },
        type: 'Invoice',
        startsAt: '2026-11-01T00:00:00Z',
        reason: 'Signed MSA',
        invoice: { netDays: 30, creditLimit: '5000', purchaseOrderNumber: 'PO-1' },
      },
    } as unknown as ComMiloapisBillingV1Alpha1BillingArrangement;
    expect(summarizeArrangement(arrangement, now)).toMatchObject({
      phase: 'Active',
      netDays: 30,
      creditLimit: '5000',
      purchaseOrderNumber: 'PO-1',
      reason: 'Signed MSA',
    });
  });
});

describe('summarizeApplication', () => {
  it('is pending until decided, with a link to review it', () => {
    const application = {
      metadata: { name: 'app-1', creationTimestamp: '2026-11-03T12:15:00Z' },
      spec: {
        billingAccountRef: { name: 'acme' },
        paymentOption: 'Invoice',
        organization: { legalName: 'Acme Holdings Ltd', type: 'Company' },
        invoice: { estimatedMonthlySpend: 'From1000To5000' },
      },
    } as unknown as ComMiloapisBillingV1Alpha1BillingArrangementApplication;
    const summary = summarizeApplication(application, 'org-acme');
    expect(summary).toMatchObject({
      phase: 'Pending',
      legalName: 'Acme Holdings Ltd',
      estimatedMonthlySpend: 'From1000To5000',
      orgName: 'org-acme',
    });
    expect(summary.url).toContain('app-1');
  });
});

describe('summarizeEntitlement', () => {
  it('reports a contract with its billing day and any waiting change', () => {
    const entitlement = {
      metadata: { annotations: { 'openmeter.miloapis.com/offerChangeAt': '2026-12-03T00:00:00Z' } },
      spec: {
        billingAccountRef: { name: 'acme' },
        offerRef: { name: 'contract-acme-1' },
        contract: { startsAt: '2026-11-03T00:00:00Z' },
      },
    } as unknown as ComMiloapisBillingV1Alpha1BillingEntitlement;
    expect(summarizeEntitlement(entitlement, null, now)).toMatchObject({
      offerName: 'contract-acme-1',
      contract: {
        startsAt: '2026-11-03T00:00:00Z',
        started: true,
        billingDay: 3,
        offerChangeAt: '2026-12-03T00:00:00Z',
      },
    });
  });

  it('has no contract for a pay-as-you-go account, and nothing without an entitlement', () => {
    const entitlement = {
      spec: { billingAccountRef: { name: 'acme' }, offerRef: { name: 'payg' } },
    } as ComMiloapisBillingV1Alpha1BillingEntitlement;
    expect(summarizeEntitlement(entitlement, null, now)?.contract).toBeNull();
    expect(summarizeEntitlement(undefined, null, now)).toBeNull();
  });
});

describe('summarizeOffer', () => {
  const offer = {
    metadata: { name: 'payg', annotations: { 'kubernetes.io/display-name': 'PAYG' } },
    spec: {
      launchStage: 'GA',
      chargeTypes: ['Usage', 'Recurring'],
      servicePricings: [
        {
          name: 'platform-fee',
          spec: {
            chargeType: 'Recurring',
            currency: 'USD',
            serviceRef: 'compute.datumapis.com',
            displayName: 'Platform fee',
            amount: '10',
            interval: 'monthly',
          },
        },
      ],
    },
  } as unknown as ComMiloapisBillingV1Alpha1Offer;

  it('marks the default and lists prices only when asked', () => {
    const brief = summarizeOffer(offer, 'payg');
    expect(brief).toMatchObject({
      name: 'payg',
      displayName: 'PAYG',
      isDefault: true,
      priceCount: 1,
    });
    expect('prices' in brief).toBe(false);

    const full = summarizeOffer(offer, 'other', { withPrices: true });
    expect(full).toMatchObject({
      isDefault: false,
      prices: [{ name: 'Platform fee', chargeType: 'Recurring', amount: '10' }],
    });
  });
});

describe('summarizeUsage', () => {
  it('lists metered usage, biggest spend first, without empty meters', () => {
    const dashboard = {
      selectedProject: 'all',
      selectedBillingCycle: 'current',
      billingCycles: [{ value: 'current', label: 'Nov 1 – Nov 30' }],
      usage: {
        status: 'ok',
        days: 30,
        spend: { amount: 12.5, currency: 'USD' },
        meters: [
          {
            meterDefinition: 'a',
            label: 'vCPU',
            values: [],
            total: 100,
            spend: { amount: 2.5, currency: 'USD' },
          },
          {
            meterDefinition: 'b',
            label: 'Egress',
            values: [],
            total: 50,
            spend: { amount: 10, currency: 'USD' },
          },
          { meterDefinition: 'c', label: 'Idle', values: [], total: 0 },
        ],
      },
    } as unknown as OrgUsageDashboardData;
    const summary = summarizeUsage(dashboard);
    expect(summary.cycleLabel).toBe('Nov 1 – Nov 30');
    expect(summary.meters.map((m) => m.label)).toEqual(['Egress', 'vCPU']);
    expect(summary.spend).toEqual({ amount: 12.5, currency: 'USD' });
  });
});
