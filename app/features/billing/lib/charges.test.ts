import {
  billingPeriodContaining,
  buildChargeSpec,
  chargeAmounts,
  chargeBillingDay,
  chargeItemOptions,
  chargeName,
  chargeQuantityText,
  chargeRemovalNote,
  chargeRemovalText,
  chargeStatusText,
  chargeSummary,
  currentBillingPeriod,
  emptyChargeFormValues,
  formatServicePeriod,
  getChargeStatus,
  invoiceNowOutcome,
  isBeforePeriod,
  isChargeRemovable,
  isInvoiceWriterReady,
  isoDayFromLocalDate,
  localDateFromIsoDay,
  nextBillingPeriod,
  parseHundredths,
  servicePeriodProblems,
  servicePeriodShapeProblems,
  sortChargesNewestFirst,
  type Charge,
  type ChargeFormValues,
} from './charges';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { describe, expect, it, vi } from 'vitest';

// Lingui's macros are compiled away in the app; tests run the source as is.
vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));

type Account = ComMiloapisBillingV1Alpha1BillingAccount;

const account = (overrides: Partial<Account> = {}): Account => ({
  metadata: { name: 'acme', annotations: { 'kubernetes.io/display-name': 'Acme' } },
  spec: { currencyCode: 'USD' },
  ...overrides,
});

const at = (iso: string) => new Date(iso);

describe('billing periods', () => {
  it('runs from the 1st under the standard terms', () => {
    expect(currentBillingPeriod(account(), at('2026-12-15T10:00:00Z'))).toEqual({
      start: '2026-12-01',
      end: '2026-12-31',
    });
  });

  it('starts on the billing day, from the previous month before it comes round', () => {
    expect(billingPeriodContaining(15, at('2026-12-14T23:59:00Z'))).toEqual({
      start: '2026-11-15',
      end: '2026-12-14',
    });
    expect(billingPeriodContaining(15, at('2026-12-15T00:00:00Z'))).toEqual({
      start: '2026-12-15',
      end: '2027-01-14',
    });
  });

  it('uses a short month’s last day for a billing day it doesn’t have', () => {
    // Day 31: January's period ends the day before 28 February.
    expect(billingPeriodContaining(31, at('2027-02-15T00:00:00Z'))).toEqual({
      start: '2027-01-31',
      end: '2027-02-27',
    });
    expect(billingPeriodContaining(31, at('2027-02-28T00:00:00Z'))).toEqual({
      start: '2027-02-28',
      end: '2027-03-30',
    });
    expect(billingPeriodContaining(31, at('2026-04-30T00:00:00Z'))).toEqual({
      start: '2026-04-30',
      end: '2026-05-30',
    });
    // A leap year's February has the 29th.
    expect(billingPeriodContaining(30, at('2028-02-29T00:00:00Z'))).toEqual({
      start: '2028-02-29',
      end: '2028-03-29',
    });
  });

  it('reads the day as UTC, whatever the time', () => {
    expect(billingPeriodContaining(1, at('2026-12-31T23:30:00Z'))).toEqual({
      start: '2026-12-01',
      end: '2026-12-31',
    });
  });

  it('bills on a started contract’s billing day, else the invoice day, else the 1st', () => {
    const now = at('2026-12-20T00:00:00Z');
    const terms = { spec: { currencyCode: 'USD', paymentTerms: { invoiceDayOfMonth: 5 } } };
    expect(chargeBillingDay(account(), now)).toBe(1);
    expect(chargeBillingDay(account(terms), now)).toBe(5);
    const contract = (startsAt: string) =>
      account({ ...terms, status: { contract: { billingDayOfMonth: 18, startsAt } } });
    expect(chargeBillingDay(contract('2026-11-18T00:00:00Z'), now)).toBe(18);
    // Not started yet: the payment terms still apply.
    expect(chargeBillingDay(contract('2027-01-18T00:00:00Z'), now)).toBe(5);
    expect(currentBillingPeriod(contract('2026-11-18T00:00:00Z'), now)).toEqual({
      start: '2026-12-18',
      end: '2027-01-17',
    });
  });

  it('works out the next billing period from the end of this one', () => {
    const contract = account({
      status: { contract: { billingDayOfMonth: 31, startsAt: '2026-01-31T00:00:00Z' } },
    });
    expect(nextBillingPeriod(contract, at('2027-02-10T00:00:00Z'))).toEqual({
      start: '2027-02-28',
      end: '2027-03-30',
    });
    expect(nextBillingPeriod(account(), at('2026-12-15T00:00:00Z'))).toEqual({
      start: '2027-01-01',
      end: '2027-01-31',
    });
  });

  it('flags dates that end before the current period', () => {
    const current = { start: '2026-12-01', end: '2026-12-31' };
    expect(isBeforePeriod('2026-11-30', current)).toBe(true);
    expect(isBeforePeriod('2026-12-01', current)).toBe(false);
    expect(isBeforePeriod('', current)).toBe(false);
  });
});

describe('service periods', () => {
  it('shows a single day, or a range', () => {
    expect(formatServicePeriod({ start: '2026-12-15', end: '2026-12-15' })).toBe('Dec 15, 2026');
    expect(formatServicePeriod({ start: '2026-12-01', end: '2026-12-31' })).toBe(
      'Dec 1, 2026 – Dec 31, 2026'
    );
    expect(formatServicePeriod(undefined)).toBe('—');
  });

  it('turns a picker’s local date into the UTC day it shows, and back', () => {
    const local = new Date(2026, 11, 15);
    expect(isoDayFromLocalDate(local)).toBe('2026-12-15');
    const back = localDateFromIsoDay('2026-12-15');
    expect([back?.getFullYear(), back?.getMonth(), back?.getDate()]).toEqual([2026, 11, 15]);
    expect(localDateFromIsoDay('2026-02-30')).toBeNull();
  });

  it('checks the order and bounds billing does', () => {
    const now = at('2026-12-15T00:00:00Z');
    expect(servicePeriodProblems({ start: '2026-12-15', end: '2026-12-15' }, now)).toEqual([]);
    expect(servicePeriodProblems({ start: '2026-12-15', end: '2026-12-14' }, now)).toEqual([
      { field: 'end', problem: 'before-start' },
    ]);
    expect(servicePeriodProblems({ start: '2024-12-14', end: '2024-12-31' }, now)).toEqual([
      { field: 'start', problem: 'too-far-back' },
    ]);
    expect(servicePeriodProblems({ start: '2027-01-01', end: '2062-01-01' }, now)).toEqual([
      { field: 'end', problem: 'too-long' },
      { field: 'end', problem: 'too-far-ahead' },
    ]);
    expect(servicePeriodProblems({ start: '', end: '2026-12-01' }, now)).toEqual([
      { field: 'start', problem: 'missing' },
    ]);
  });

  it("checks a period's own dates, whenever they are, for a contract fee's supply date", () => {
    expect(servicePeriodShapeProblems({ start: '2019-01-01', end: '2019-01-01' })).toEqual([]);
    expect(servicePeriodShapeProblems({ start: '2040-01-01', end: '2040-01-31' })).toEqual([]);
    expect(servicePeriodShapeProblems({ start: '2027-01-02', end: '2027-01-01' })).toEqual([
      { field: 'end', problem: 'before-start' },
    ]);
    expect(servicePeriodShapeProblems({ start: '2027-01-01', end: '2032-01-02' })).toEqual([
      { field: 'end', problem: 'too-long' },
    ]);
    expect(servicePeriodShapeProblems({ start: '2027-02-30', end: '' })).toEqual([
      { field: 'start', problem: 'missing' },
      { field: 'end', problem: 'missing' },
    ]);
  });
});

describe('amounts', () => {
  it('parses decimals with up to two places', () => {
    expect(parseHundredths('2')).toBe(200n);
    expect(parseHundredths('3.5')).toBe(350n);
    expect(parseHundredths('1,250.00')).toBe(125000n);
    expect(parseHundredths('1,234,567')).toBe(123456700n);
    expect(parseHundredths('0.333')).toBeNull();
    expect(parseHundredths('-1')).toBeNull();
    expect(parseHundredths('')).toBeNull();
  });

  it('refuses a decimal comma rather than reading it as thousands', () => {
    // As typed in French: not 150 and 25.
    expect(parseHundredths('1,50')).toBeNull();
    expect(parseHundredths('2,5')).toBeNull();
    expect(parseHundredths('1,2345')).toBeNull();
    expect(parseHundredths(',250')).toBeNull();
    expect(chargeAmounts('2,5', '1,50')).toEqual({ ok: false, problem: 'quantity' });
  });

  it('works out the amount and discount in cents', () => {
    expect(chargeAmounts('2', '250.00', '10')).toEqual({
      ok: true,
      amount: 50000n,
      discount: 5000n,
      amountDue: 45000n,
    });
    expect(chargeAmounts('3.5', '150', '')).toEqual({
      ok: true,
      amount: 52500n,
      discount: 0n,
      amountDue: 52500n,
    });
    // A waived install still shows on the invoice.
    expect(chargeAmounts('1', '0')).toMatchObject({ ok: true, amountDue: 0n });
    expect(chargeAmounts('2', '9.99', '100')).toMatchObject({ ok: true, amountDue: 0n });
  });

  it('refuses amounts that aren’t whole cents, as billing does', () => {
    expect(chargeAmounts('3.33', '0.15')).toEqual({ ok: false, problem: 'amount' });
    expect(chargeAmounts('1', '3.35', '10')).toEqual({ ok: false, problem: 'discount' });
    expect(chargeAmounts('1', '3.30', '10')).toMatchObject({ ok: true, amountDue: 297n });
    expect(chargeAmounts('1', '100', '12.5')).toMatchObject({ ok: true, amountDue: 8750n });
  });

  it('refuses a quantity, price or discount billing wouldn’t take', () => {
    expect(chargeAmounts('0', '10')).toEqual({ ok: false, problem: 'quantity' });
    expect(chargeAmounts('1', '')).toEqual({ ok: false, problem: 'unitAmount' });
    expect(chargeAmounts('1', '10', '0')).toEqual({ ok: false, problem: 'discountPercent' });
    expect(chargeAmounts('1', '10', '100.01')).toEqual({ ok: false, problem: 'discountPercent' });
  });
});

const values = (overrides: Partial<ChargeFormValues> = {}): ChargeFormValues => ({
  ...emptyChargeFormValues(),
  ...overrides,
});

describe('buildChargeSpec', () => {
  it('sends a catalog item as staff left it, with the dates they chose', () => {
    const spec = buildChargeSpec(
      values({
        item: 'pricing:cross-connect-install-v1',
        description: ' Cross-connect install, cage 12 ',
        quantity: '2',
        unitAmount: '250',
        taxCode: 'txcd_20030000',
        discountPercent: '10',
        setPeriod: true,
        periodStart: '2026-12-15',
        periodEnd: '2026-12-15',
        note: 'Agreed price, OPS-1234',
      }),
      'acme'
    );
    expect(spec).toEqual({
      billingAccountRef: { name: 'acme' },
      servicePricingRef: { name: 'cross-connect-install-v1', namespace: 'milo-system' },
      description: 'Cross-connect install, cage 12',
      quantity: '2',
      unitAmount: '250.00',
      currency: 'USD',
      tax: { code: 'txcd_20030000' },
      discountPercent: '10',
      servicePeriod: { start: '2026-12-15', end: '2026-12-15' },
      note: 'Agreed price, OPS-1234',
      invoice: 'NextInvoice',
    });
  });

  it('leaves the supply date out when unticked, for billing to default', () => {
    const spec = buildChargeSpec(
      values({
        item: 'Remote hands, December',
        description: 'Remote hands, December',
        quantity: '3.50',
        unitAmount: '150',
        periodStart: '2026-12-01',
        periodEnd: '2026-12-31',
        invoice: 'Now',
      }),
      'acme'
    );
    expect(spec).toEqual({
      billingAccountRef: { name: 'acme' },
      description: 'Remote hands, December',
      quantity: '3.5',
      unitAmount: '150.00',
      currency: 'USD',
      invoice: 'Now',
    });
    expect(spec).not.toHaveProperty('servicePeriod');
    expect(spec).not.toHaveProperty('servicePricingRef');
    expect(spec).not.toHaveProperty('tax');
  });

  it('marks a charge not taxable without a code', () => {
    const spec = buildChargeSpec(
      values({ item: 'Deposit', description: 'Deposit', unitAmount: '10', notTaxable: true }),
      'acme'
    );
    expect(spec.tax).toEqual({ taxable: false });
  });

  it('keeps billing from filling in a catalog item’s tax code staff removed', () => {
    const spec = buildChargeSpec(
      values({ item: 'pricing:install-v1', description: 'Install', unitAmount: '10' }),
      'acme'
    );
    expect(spec.tax).toEqual({ taxable: true });
  });
});

describe('chargeName', () => {
  it('is a slug of the description and a suffix', () => {
    expect(chargeName('Cross-connect install, cage 12', 'x7k2p')).toBe(
      'cross-connect-install-cage-12-x7k2p'
    );
    expect(chargeName('Remote hands — Décembre', 'x7k2p')).toBe('remote-hands-decembre-x7k2p');
    expect(chargeName('!!!', 'x7k2p')).toBe('charge-x7k2p');
    expect(chargeName('a'.repeat(80), 'x7k2p')).toHaveLength(46);
  });

  it('picks a random suffix Kubernetes would accept', () => {
    const name = chargeName('Install');
    expect(name).toMatch(/^install-[bcdfghjklmnpqrstvwxz2456789]{5}$/);
  });
});

describe('chargeSummary', () => {
  const current = { start: '2026-12-01', end: '2026-12-31' };

  it('reads like the invoice line, without the SKU', () => {
    expect(
      chargeSummary(
        values({
          description: 'Cross-connect install, cage 12',
          quantity: '2',
          unitAmount: '250',
          discountPercent: '10',
          setPeriod: true,
          periodStart: '2026-12-15',
          periodEnd: '2026-12-15',
        }),
        current
      )
    ).toEqual({
      description: 'Cross-connect install, cage 12',
      line: '2 × $250.00, less 10%',
      amount: '$450.00',
      dates: 'Dec 15, 2026',
    });
  });

  it('shows the current billing period when the dates are left to billing', () => {
    const summary = chargeSummary(
      values({ description: 'Remote hands', quantity: '3.5', unitAmount: '1,500' }),
      current
    );
    expect(summary).toMatchObject({
      line: '3.5 × $1,500.00',
      amount: '$5,250.00',
      dates: 'Dec 1, 2026 – Dec 31, 2026',
    });
  });

  it('leaves the amount out until it can be worked out', () => {
    expect(chargeSummary(values({ unitAmount: 'abc' }), current)).toMatchObject({
      line: '',
      amount: '',
    });
    expect(chargeSummary(values({ quantity: '3.33', unitAmount: '0.15' }), current)).toMatchObject({
      line: '3.33 × $0.15',
      amount: '',
    });
  });
});

describe('invoiceNowOutcome', () => {
  it('sends an invoice to an account that pays by invoice', () => {
    const invoiced = account({
      status: {
        paymentArrangement: { name: 'terms', type: 'Invoice', invoice: { netDays: 30 } },
      },
    });
    expect(invoiceNowOutcome(invoiced, 45000n)).toBe(
      'Acme is sent an invoice for $450.00 plus tax, due in 30 days.'
    );
  });

  it('charges the card on file otherwise', () => {
    const card = { metadata: { name: 'card-1' } };
    expect(invoiceNowOutcome(account(), 45000n, [card])).toBe(
      'The card on file is charged $450.00 plus tax straight away.'
    );
    // Before the payment methods load.
    expect(invoiceNowOutcome(account(), 45000n)).toBe(
      'The card on file is charged $450.00 plus tax straight away.'
    );
  });

  it('charges nothing for $0.00', () => {
    expect(invoiceNowOutcome(account(), 0n, [])).toBe(
      'The invoice comes to $0.00, so nothing is charged.'
    );
  });

  it('says Stripe carries an amount under its minimum to the next invoice', () => {
    expect(invoiceNowOutcome(account(), 49n, [{ metadata: { name: 'card-1' } }])).toBe(
      "If $0.49 plus tax is under Stripe's $0.50 minimum, Stripe carries it to Acme's next invoice instead of charging the card."
    );
  });

  it('says an account without a card is left with an unpaid invoice', () => {
    expect(invoiceNowOutcome(account(), 45000n, [])).toBe(
      'Acme has no card on file, so the invoice for $450.00 plus tax stays unpaid until one is added.'
    );
  });
});

describe('chargeItemOptions', () => {
  const pricing = (
    name: string,
    spec: Partial<NonNullable<ComMiloapisBillingV1Alpha1ServicePricing['spec']>>,
    labels?: Record<string, string>
  ): ComMiloapisBillingV1Alpha1ServicePricing =>
    ({
      metadata: { name, ...(labels ? { labels } : {}) },
      spec: { currency: 'USD', displayName: name, ...spec },
    }) as ComMiloapisBillingV1Alpha1ServicePricing;

  it('offers one-time and recurring pricings, the account’s contract fees first', () => {
    const pricings = [
      pricing('install-v1', { chargeType: 'OneTime', amount: '300', sku: 'DC-INST' }),
      pricing('rack-v1', { chargeType: 'Recurring', amount: '1000' }),
      pricing('cpu-v1', { chargeType: 'Usage' }),
      pricing(
        'custom-charge',
        { chargeType: 'OneTime', amount: '0' },
        { 'billing.miloapis.com/purpose': 'custom-charge' }
      ),
      pricing(
        'contract-acme-20261201-fee-1',
        { chargeType: 'OneTime', amount: '250' },
        { 'billing.miloapis.com/contract-billing-account': 'acme' }
      ),
      pricing(
        'contract-other-20261201-fee-1',
        { chargeType: 'OneTime', amount: '99' },
        { 'billing.miloapis.com/contract-billing-account': 'other' }
      ),
    ];
    const withContract = account({
      status: {
        contract: {
          billingDayOfMonth: 1,
          startsAt: '2026-12-01T00:00:00Z',
          fees: [
            {
              name: 'contract-acme-20261201-fee-1',
              amount: '250',
              chargeType: 'OneTime',
              currency: 'USD',
            },
          ],
        },
      },
    });
    const options = chargeItemOptions(pricings, withContract);
    expect(options.accountPrices.map((option) => option.name)).toEqual([
      'contract-acme-20261201-fee-1',
    ]);
    expect(options.catalog.map((option) => option.name)).toEqual(['install-v1', 'rack-v1']);
    expect(options.catalog[0]).toMatchObject({ sku: 'DC-INST', amount: '300' });
  });
});

const charge = (overrides: Partial<Charge> = {}, spec: Partial<Charge['spec']> = {}): Charge => ({
  metadata: { name: 'install-abc12', creationTimestamp: '2026-12-01T10:00:00Z' },
  spec: {
    billingAccountRef: { name: 'acme' },
    description: 'Install',
    quantity: '2',
    unitAmount: '250.00',
    invoice: 'NextInvoice',
    ...spec,
  },
  ...overrides,
});

describe('charge status', () => {
  it('says when a scheduled charge is invoiced', () => {
    const scheduled = charge({
      status: { phase: 'Scheduled', invoiceAt: '2027-01-01T00:00:00Z' },
    });
    expect(chargeStatusText(getChargeStatus(scheduled))).toBe('Next invoice, Jan 1, 2027');
    expect(
      chargeStatusText(
        getChargeStatus(charge({ status: { phase: 'Scheduled' } }, { invoice: 'Now' }))
      )
    ).toBe('Invoicing now');
  });

  it('names the invoice an invoiced charge is on', () => {
    const invoiced = charge({
      status: { phase: 'Invoiced', invoiceRef: { name: 'acme-2027-01-abc' } },
    });
    expect(getChargeStatus(invoiced)).toEqual({
      kind: 'invoiced',
      invoiceName: 'acme-2027-01-abc',
    });
    expect(chargeStatusText(getChargeStatus(invoiced))).toBe('Invoiced on acme-2027-01-abc');
    expect(isChargeRemovable(invoiced)).toBe(false);
    // The provider hasn't named the invoice yet.
    expect(chargeStatusText(getChargeStatus(charge({ status: { phase: 'Invoiced' } })))).toBe(
      'Invoiced'
    );
  });

  it('says what a pending charge waits for, and why one failed', () => {
    const condition = (reason: string, message: string) => ({
      type: 'Ready',
      status: 'False' as const,
      reason,
      message,
      lastTransitionTime: '2026-12-01T10:00:00Z',
    });
    const pending = charge({
      status: {
        phase: 'Pending',
        conditions: [condition('WaitingForInvoiceWriter', 'the account is off the invoice writer')],
      },
    });
    expect(chargeStatusText(getChargeStatus(pending))).toBe(
      'Waiting for the account to move to the invoice writer'
    );
    const waitingFor = (reason: string) =>
      chargeStatusText(
        getChargeStatus(
          charge({ status: { phase: 'Pending', conditions: [condition(reason, 'Waiting for x')] } })
        )
      );
    expect(waitingFor('WaitingForProvider')).toBe('Waiting for the billing provider');
    expect(waitingFor('WaitingForCustomer')).toBe("Waiting for the account's billing customer");
    expect(waitingFor('WaitingForAmounts')).toBe('Waiting for billing to work out the amount');
    // A reason this doesn't know shows the condition's own message.
    expect(waitingFor('SomethingElse')).toBe('Waiting for x');
    expect(chargeStatusText(getChargeStatus(charge()))).toBe('Waiting');
    expect(isChargeRemovable(pending)).toBe(true);
    const failed = charge({
      status: { phase: 'Failed', conditions: [condition('ProviderRefused', 'line refused')] },
    });
    expect(chargeStatusText(getChargeStatus(failed))).toBe('Failed: line refused');
  });

  it('shows the quantity and unit price', () => {
    expect(chargeQuantityText(charge({}, { quantity: '3.50', unitAmount: '150' }).spec)).toBe(
      '3.5 × $150.00'
    );
  });

  it('lets a charge be removed only until it goes on its invoice', () => {
    const onInvoice = (status: 'True' | 'False') => ({
      type: 'OnInvoice',
      status,
      reason: status === 'True' ? 'Added' : 'Held',
      message: '',
      lastTransitionTime: '2026-12-01T10:00:00Z',
    });
    const held = charge({
      status: {
        phase: 'Scheduled',
        invoiceAt: '2027-01-01T00:00:00Z',
        removableUntil: '2026-12-31T00:00:00Z',
        conditions: [onInvoice('False')],
      },
    });
    expect(isChargeRemovable(held)).toBe(true);
    expect(chargeRemovalNote(held)).toBe('Can be removed until Dec 31, 2026, 00:00 UTC');
    expect(chargeRemovalText(held)).toBe(
      "Install is held until Dec 31, 2026, 00:00 UTC and isn't on an invoice yet, so removing it bills nothing."
    );

    const added = charge({
      status: {
        phase: 'Scheduled',
        invoiceAt: '2027-01-01T00:00:00Z',
        conditions: [onInvoice('True')],
      },
    });
    expect(isChargeRemovable(added)).toBe(false);
    expect(chargeRemovalNote(added)).toBe(
      "On its invoice, so it can't be removed. Once the invoice is issued, correct it with a credit note."
    );
    const addedNow = charge(
      { status: { phase: 'Scheduled', conditions: [onInvoice('True')] } },
      { invoice: 'Now' }
    );
    expect(isChargeRemovable(addedNow)).toBe(false);
  });

  it('says what removing a charge does, by where it is', () => {
    const named = (status: Charge['status'], invoice: 'NextInvoice' | 'Now' = 'NextInvoice') =>
      chargeRemovalText(charge({ status }, { description: 'Install', invoice }));
    expect(named({ phase: 'Pending' }, 'Now')).toBe(
      "Install isn't on an invoice yet, so it won't be billed."
    );
    expect(named({ phase: 'Failed' }, 'Now')).toBe(
      "Install didn't reach an invoice, so it won't be billed."
    );
    expect(chargeRemovalNote(charge({ status: { phase: 'Pending' } }))).toBeUndefined();
  });

  it('lists charges newest first', () => {
    const older = charge({ metadata: { name: 'a', creationTimestamp: '2026-11-01T00:00:00Z' } });
    const newer = charge({ metadata: { name: 'b', creationTimestamp: '2026-12-01T00:00:00Z' } });
    expect(sortChargesNewestFirst([older, newer]).map((c) => c.metadata?.name)).toEqual(['b', 'a']);
  });
});

describe('isInvoiceWriterReady', () => {
  const withCondition = (status: 'True' | 'False') =>
    account({
      status: {
        conditions: [
          {
            type: 'InvoiceWriterReady',
            status,
            reason: 'CustomInvoicing',
            message: '',
            lastTransitionTime: '2026-12-01T00:00:00Z',
          },
        ],
      },
    });

  it('is true only when the condition is True', () => {
    expect(isInvoiceWriterReady(withCondition('True'))).toBe(true);
    expect(isInvoiceWriterReady(withCondition('False'))).toBe(false);
    expect(isInvoiceWriterReady(account())).toBe(false);
  });
});
