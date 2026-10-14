import {
  buildArrangementPatch,
  buildArrangementSpec,
  buildEndArrangementPatch,
  emptyPaymentTermsForm,
  getArrangementPhase,
  getBillingStatus,
  getArrangementsForAccount,
  getCurrentArrangement,
  paymentTermsFormFromArrangement,
  paymentTermsFormSchema,
  WITHDRAW_CLOCK_SKEW_MS,
  type BillingArrangement,
} from '@/features/billing/lib/payment-terms';

const day = (d: number) => new Date(Date.UTC(2026, 9, d));
const iso = (d: number) => day(d).toISOString();

const arrangement = (
  name: string,
  startsAt?: string,
  endsAt?: string,
  account = 'acme'
): BillingArrangement => ({
  metadata: { name, creationTimestamp: iso(1) },
  spec: {
    billingAccountRef: { name: account },
    type: 'Invoice',
    invoice: { netDays: 30, creditLimit: '10000', purchaseOrderNumber: 'PO-4471' },
    startsAt,
    endsAt,
    reason: 'Signed MSA',
  },
});

describe('getArrangementPhase', () => {
  it('is scheduled before the start, active from the start and ended from the end', () => {
    const terms = arrangement('terms', iso(10), iso(20));
    expect(getArrangementPhase(terms, day(5))).to.equal('Scheduled');
    expect(getArrangementPhase(terms, day(10))).to.equal('Active');
    expect(getArrangementPhase(terms, day(20))).to.equal('Ended');
  });

  it('falls back to the creation time when startsAt is unset', () => {
    expect(getArrangementPhase(arrangement('terms'), day(2))).to.equal('Active');
  });

  it('treats terms withdrawn before they started as ended', () => {
    expect(getArrangementPhase(arrangement('terms', iso(10), iso(5)), day(6))).to.equal('Ended');
  });
});

describe('getArrangementsForAccount and getCurrentArrangement', () => {
  const all = [
    arrangement('old', iso(1), iso(5)),
    arrangement('current', iso(5), iso(20)),
    arrangement('next', iso(20)),
    arrangement('other-account', iso(1), undefined, 'globex'),
  ];

  it('keeps one account and orders newest start first', () => {
    expect(getArrangementsForAccount(all, 'acme').map((a) => a.metadata?.name)).to.deep.equal([
      'next',
      'current',
      'old',
    ]);
  });

  it('picks the active terms, otherwise the next scheduled ones', () => {
    const forAccount = getArrangementsForAccount(all, 'acme');
    expect(getCurrentArrangement(forAccount, day(10))?.metadata?.name).to.equal('current');
    expect(getCurrentArrangement(forAccount.slice(0, 1), day(10))?.metadata?.name).to.equal('next');
    expect(getCurrentArrangement([arrangement('old', iso(1), iso(5))], day(10))).to.equal(
      undefined
    );
  });
});

describe('getBillingStatus', () => {
  const condition = (status: string, reason: string) =>
    ({ type: 'PaymentReady', status, reason, message: '', lastTransitionTime: '' }) as never;

  it('turns PaymentReady into how the account is billed', () => {
    expect(getBillingStatus(condition('True', 'InvoiceTerms'))).to.equal('invoice');
    expect(getBillingStatus(condition('True', 'PaymentMethodReady'))).to.equal('card');
    expect(getBillingStatus(condition('False', 'ArrangementScheduled'))).to.equal(
      'terms-scheduled'
    );
    expect(getBillingStatus(condition('False', 'ArrangementEnded'))).to.equal('terms-ended');
    expect(getBillingStatus(condition('False', 'PaymentMethodDegraded'))).to.equal('card-failing');
    expect(getBillingStatus(condition('False', 'NotConfigured'))).to.equal('not-set-up');
    expect(getBillingStatus(condition('False', 'SomethingNew'))).to.equal('not-set-up');
    expect(getBillingStatus(condition('Unknown', 'Unknown'))).to.equal('unknown');
    expect(getBillingStatus(undefined)).to.equal('unknown');
  });
});

describe('paymentTermsFormSchema', () => {
  const valid = { ...emptyPaymentTermsForm, creditLimit: '10000', reason: 'Signed MSA' };

  it('accepts the defaults with a credit limit and reason', () => {
    expect(paymentTermsFormSchema.safeParse(valid).success).to.equal(true);
  });

  it('rejects a zero or malformed credit limit', () => {
    expect(paymentTermsFormSchema.safeParse({ ...valid, creditLimit: '0' }).success).to.equal(
      false
    );
    expect(paymentTermsFormSchema.safeParse({ ...valid, creditLimit: '1,000' }).success).to.equal(
      false
    );
  });

  it('keeps net days between 1 and 90', () => {
    expect(paymentTermsFormSchema.safeParse({ ...valid, netDays: 0 }).success).to.equal(false);
    expect(paymentTermsFormSchema.safeParse({ ...valid, netDays: 91 }).success).to.equal(false);
    expect(paymentTermsFormSchema.safeParse({ ...valid, netDays: '45' }).success).to.equal(true);
  });

  it('requires a reason', () => {
    expect(paymentTermsFormSchema.safeParse({ ...valid, reason: '  ' }).success).to.equal(false);
  });

  it('treats a cleared date as no date, never as 1970', () => {
    for (const cleared of ['', null, undefined]) {
      const result = paymentTermsFormSchema.safeParse({ ...valid, endsAt: cleared });
      expect(result.success, `endsAt ${JSON.stringify(cleared)}`).to.equal(true);
      expect(result.success && result.data.endsAt).to.equal(undefined);
    }
  });

  it('requires the end date to be after the start date', () => {
    const result = paymentTermsFormSchema.safeParse({
      ...valid,
      startsAt: day(10),
      endsAt: day(5),
    });
    expect(result.success).to.equal(false);
    expect(result.error?.issues[0]?.path).to.deep.equal(['endsAt']);
  });
});

describe('buildArrangementSpec', () => {
  it('builds Invoice terms for the account and leaves an empty start to the API', () => {
    const spec = buildArrangementSpec(
      {
        ...emptyPaymentTermsForm,
        creditLimit: ' 10000 ',
        purchaseOrderNumber: '  ',
        endsAt: day(30),
        reason: ' Signed MSA ',
      },
      'acme'
    );
    expect(spec).to.deep.equal({
      billingAccountRef: { name: 'acme' },
      type: 'Invoice',
      invoice: {
        netDays: 30,
        creditLimit: '10000',
        accountsPayableEmail: undefined,
        purchaseOrderNumber: undefined,
        agreementReference: undefined,
      },
      endsAt: iso(30),
      reason: 'Signed MSA',
    });
  });
});

describe('buildArrangementPatch', () => {
  const values = {
    ...paymentTermsFormFromArrangement(arrangement('terms', iso(10), iso(20))),
    purchaseOrderNumber: '',
    endsAt: undefined,
  };

  it('removes cleared fields with null and never sends immutable fields', () => {
    const patch = buildArrangementPatch(values, { canChangeStart: false });
    expect(patch.spec.invoice?.purchaseOrderNumber).to.equal(null);
    expect(patch.spec.endsAt).to.equal(null);
    expect(patch.spec).not.to.have.property('startsAt');
    expect(patch.spec).not.to.have.property('billingAccountRef');
    expect(patch.spec).not.to.have.property('type');
  });

  it('only moves the start while terms are scheduled', () => {
    const patch = buildArrangementPatch(values, { canChangeStart: true });
    expect(patch.spec.startsAt).to.equal(iso(10));
  });
});

describe('buildEndArrangementPatch', () => {
  it('ends active terms now', () => {
    expect(buildEndArrangementPatch('Active', day(10)).spec.endsAt).to.equal(iso(10));
  });

  it('backdates a withdrawal so a fast browser clock is not in the API server future', () => {
    expect(buildEndArrangementPatch('Scheduled', day(10)).spec.endsAt).to.equal(
      new Date(day(10).getTime() - WITHDRAW_CLOCK_SKEW_MS).toISOString()
    );
  });
});
