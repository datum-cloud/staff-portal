import type { Invoice } from '../utils';
import {
  getAccountHealth,
  LARGE_CARD_BALANCE,
  type AccountHealthInputs,
  type HealthIssue,
} from './account-health';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1PaymentMethod,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

const NOW = new Date('2026-11-12T12:00:00Z');

const account = (
  overrides: Partial<NonNullable<ComMiloapisBillingV1Alpha1BillingAccount['spec']>> = {},
  status: ComMiloapisBillingV1Alpha1BillingAccount['status'] = {
    phase: 'Ready',
    conditions: [
      {
        type: 'PaymentReady',
        status: 'True',
        reason: 'PaymentMethodReady',
        message: '',
        lastTransitionTime: '2026-07-09T00:00:00Z',
      },
    ],
  }
): ComMiloapisBillingV1Alpha1BillingAccount => ({
  metadata: { name: 'ba-test', namespace: 'organization-test' },
  spec: {
    currencyCode: 'USD',
    defaultPaymentMethodRef: { name: 'primary' },
    contactInfo: { email: 'a@example.com', name: 'A' },
    ...overrides,
  },
  status,
});

const card = (
  overrides: Partial<NonNullable<ComMiloapisBillingV1Alpha1PaymentMethod['status']>> = {},
  expiry = { expiryMonth: 2, expiryYear: 2029 }
): ComMiloapisBillingV1Alpha1PaymentMethod => ({
  metadata: { name: 'primary', namespace: 'organization-test' },
  spec: { billingAccountRef: { name: 'ba-test' }, displayName: 'Primary' },
  status: {
    phase: 'Active',
    details: {
      type: 'card',
      card: { brand: 'visa', country: 'US', last4: '4242', ...expiry },
    },
    ...overrides,
  },
});

const invoice = (name: string, status: NonNullable<Invoice['status']>): Invoice => ({
  metadata: { name },
  spec: {
    billingAccountRef: { name: 'ba-test' },
    period: { start: '2026-10-01T00:00:00Z', end: '2026-10-31T00:00:00Z' },
  },
  status,
});

const paid = (name: string, total: string) =>
  invoice(name, { phase: 'Paid', total, amountPaid: total, amountDue: '0' });

const healthy: AccountHealthInputs = {
  account: account(),
  invoices: [paid('a', '10'), paid('b', '12'), paid('c', '11')],
  paymentMethods: [card()],
  entitlement: { spec: { billingAccountRef: { name: 'ba-test' }, offerRef: { name: 'free' } } },
  usage: { current: 10, previous: 9, currency: 'USD' },
  now: NOW,
};

const issuesFor = (inputs: Partial<AccountHealthInputs>): HealthIssue[] =>
  getAccountHealth({ ...healthy, ...inputs }).issues;

const keysOf = (issues: HealthIssue[]) => issues.map((issue) => issue.key);

describe('getAccountHealth', () => {
  it('passes every check for a healthy account', () => {
    const health = getAccountHealth(healthy);
    expect(health.issues).toEqual([]);
    expect(health.pending).toEqual([]);
    expect(health.passing).toHaveLength(9);
  });

  it('marks checks pending while their inputs load', () => {
    const health = getAccountHealth({ account: account(), now: NOW });
    expect(health.pending).toEqual(
      expect.arrayContaining([
        'invoicePastDue',
        'invoiceUnusual',
        'largeCardBalance',
        'paymentMethod',
        'cardExpiry',
        'usageSpike',
        'offer',
      ])
    );
    expect(health.passing).toEqual(expect.arrayContaining(['taxId', 'creditLimit']));
  });

  it('sorts issues most severe first', () => {
    const issues = issuesFor({
      account: account({ contactInfo: { email: 'a@example.com', businessName: 'Chips' } }),
      invoices: [invoice('late', { phase: 'PastDue', amountDue: '5', dueDate: '2026-10-14' })],
      entitlement: null,
    });
    expect(issues.map((issue) => issue.severity)).toEqual(['error', 'warning', 'info']);
  });
});

describe('invoicePastDue', () => {
  it('raises an error per past-due invoice with days overdue', () => {
    const [issue] = issuesFor({
      invoices: [
        invoice('late', {
          phase: 'PastDue',
          total: '4153100',
          amountDue: '4153100',
          dueDate: '2026-10-14T00:00:00Z',
        }),
      ],
    });
    expect(issue).toMatchObject({
      key: 'invoicePastDue',
      severity: 'error',
      invoiceName: 'late',
      amount: 4153100,
      daysOverdue: 29,
    });
  });
});

describe('invoiceUnusual', () => {
  it('flags an invoice over 100× the median of the others', () => {
    const issues = issuesFor({
      invoices: [paid('a', '10'), paid('b', '12'), paid('c', '11'), paid('huge', '1101')],
    });
    expect(issues).toEqual([
      expect.objectContaining({ key: 'invoiceUnusual', invoiceNames: ['huge'] }),
    ]);
  });

  it('leaves an invoice at 100× the median alone', () => {
    expect(
      issuesFor({
        invoices: [paid('a', '10'), paid('b', '10'), paid('c', '10'), paid('d', '1000')],
      })
    ).toEqual([]);
  });

  it('needs at least 3 other non-zero invoices', () => {
    expect(
      issuesFor({
        invoices: [paid('a', '10'), paid('b', '10'), paid('zero', '0'), paid('d', '9999')],
      })
    ).toEqual([]);
  });
});

describe('largeCardBalance', () => {
  const owing = (amountDue: string) => [invoice('open', { phase: 'Open', amountDue })];

  it('warns above the threshold on a card-billed account', () => {
    expect(keysOf(issuesFor({ invoices: owing(String(LARGE_CARD_BALANCE + 1)) }))).toEqual([
      'largeCardBalance',
    ]);
  });

  it('stays quiet at the threshold', () => {
    expect(issuesFor({ invoices: owing(String(LARGE_CARD_BALANCE)) })).toEqual([]);
  });

  it('ignores accounts on invoice terms', () => {
    const onTerms = account(
      {},
      {
        phase: 'Ready',
        paymentArrangement: { name: 'terms', type: 'Invoice', invoice: { creditLimit: '1000000' } },
      }
    );
    expect(
      keysOf(issuesFor({ account: onTerms, invoices: owing(String(LARGE_CARD_BALANCE * 2)) }))
    ).toEqual([]);
  });
});

describe('paymentMethod', () => {
  it('raises an error when the default card has failed', () => {
    const [issue] = issuesFor({
      paymentMethods: [card({ phase: 'Failed', failureMessage: 'Card declined' })],
    });
    expect(issue).toMatchObject({
      key: 'paymentMethod',
      reason: 'failed',
      failureMessage: 'Card declined',
    });
  });

  it('raises an error when a card-billed account has no payment method', () => {
    expect(issuesFor({ paymentMethods: [] })).toEqual([
      expect.objectContaining({ key: 'paymentMethod', reason: 'missing' }),
    ]);
  });
});

describe('cardExpiry', () => {
  it('warns within 30 days of expiry', () => {
    const [issue] = issuesFor({
      paymentMethods: [card({}, { expiryMonth: 11, expiryYear: 2026 })],
    });
    expect(issue).toMatchObject({ key: 'cardExpiry', severity: 'warning', expired: false });
  });

  it('raises an error once expired', () => {
    const [issue] = issuesFor({
      paymentMethods: [card({}, { expiryMonth: 10, expiryYear: 2026 })],
    });
    expect(issue).toMatchObject({ key: 'cardExpiry', severity: 'error', expired: true });
  });
});

describe('creditLimit', () => {
  it('warns when the open balance exceeds the arrangement credit limit', () => {
    const onTerms = account(
      {},
      {
        phase: 'Ready',
        paymentArrangement: { name: 'terms', type: 'Invoice', invoice: { creditLimit: '500' } },
      }
    );
    expect(
      keysOf(
        issuesFor({
          account: onTerms,
          invoices: [invoice('open', { phase: 'Open', amountDue: '600' })],
        })
      )
    ).toEqual(['creditLimit']);
  });
});

describe('usageSpike', () => {
  it('warns when spend is 5× last cycle at the same point', () => {
    expect(keysOf(issuesFor({ usage: { current: 50, previous: 10, currency: 'USD' } }))).toEqual([
      'usageSpike',
    ]);
  });

  it('ignores a tiny previous base', () => {
    expect(issuesFor({ usage: { current: 18.42, previous: 0.92, currency: 'USD' } })).toEqual([]);
  });
});

describe('taxId', () => {
  it('flags a business with no tax ID', () => {
    expect(
      issuesFor({
        account: account({
          contactInfo: {
            email: 'a@example.com',
            businessName: 'Chips Coding',
            address: { country: 'GB' },
          },
        }),
      })
    ).toEqual([{ key: 'taxId', severity: 'info', country: 'GB' }]);
  });

  it('passes with a tax ID on file', () => {
    expect(
      issuesFor({
        account: account({
          contactInfo: { email: 'a@example.com', businessName: 'Chips Coding' },
          taxIds: [{ type: 'gb_vat', value: 'GB123' }],
        }),
      })
    ).toEqual([]);
  });
});

describe('offer', () => {
  it('warns when the account has no entitlement', () => {
    expect(issuesFor({ entitlement: null })).toEqual([{ key: 'offer', severity: 'warning' }]);
  });
});
