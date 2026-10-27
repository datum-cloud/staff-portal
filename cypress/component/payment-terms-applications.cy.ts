import { buildArrangementSpec } from '@/features/billing/lib/payment-terms';
import {
  buildDeclineSpec,
  declineApplicationFormSchema,
  formatSpendBand,
  getApplicationOrgName,
  getApplicationPhase,
  getApplicationsForAccount,
  getDeclineForApplication,
  paymentTermsFormFromApplication,
  sortApplicationQueue,
  type ApplicationPhase,
  type BillingArrangementApplication,
} from '@/features/billing/lib/payment-terms-applications';

const iso = (d: number) => new Date(Date.UTC(2026, 9, d)).toISOString();

const application = (
  name: string,
  submitted: number,
  overrides: {
    phase?: ApplicationPhase;
    withdrawn?: boolean;
    account?: string;
  } = {}
): BillingArrangementApplication => ({
  metadata: { name, namespace: 'organization-acme', creationTimestamp: iso(submitted) },
  spec: {
    billingAccountRef: { name: overrides.account ?? 'acme-billing' },
    paymentOption: 'Invoice',
    organization: { legalName: 'Acme Corp Ltd', type: 'Company', website: 'https://acme.com' },
    situation: 'We pay vendors by purchase order.',
    invoice: {
      estimatedMonthlySpend: 'From2500To10000',
      accountsPayableEmail: 'ap@acme.com',
      purchaseOrderNumber: 'PO-4471',
      agreementReference: 'MSA-2026-014',
    },
    authorized: true,
    applicant: { username: 'jane@acme.com', uid: 'user-1' },
    withdrawn: overrides.withdrawn,
  },
  status: overrides.phase ? { phase: overrides.phase } : undefined,
});

describe('payment terms applications', () => {
  it('reads the phase from status, or from spec.withdrawn before billing reconciles', () => {
    expect(getApplicationPhase(application('a', 1, { phase: 'Approved' }))).to.equal('Approved');
    expect(getApplicationPhase(application('a', 1))).to.equal('Pending');
    expect(getApplicationPhase(application('a', 1, { withdrawn: true }))).to.equal('Withdrawn');
  });

  it('finds the organization from the namespace', () => {
    expect(getApplicationOrgName(application('a', 1))).to.equal('acme');
    expect(getApplicationOrgName({ metadata: { namespace: 'milo-system' } })).to.equal('');
  });

  it('puts pending applications first, oldest first, then the rest newest first', () => {
    const queue = sortApplicationQueue([
      application('declined-old', 1, { phase: 'Declined' }),
      application('pending-new', 9),
      application('approved-new', 8, { phase: 'Approved' }),
      application('pending-old', 2),
    ]);
    expect(queue.map((a) => a.metadata?.name)).to.deep.equal([
      'pending-old',
      'pending-new',
      'approved-new',
      'declined-old',
    ]);
  });

  it("lists one account's applications, newest first", () => {
    const applications = getApplicationsForAccount(
      [
        application('first', 1),
        application('other-account', 5, { account: 'other' }),
        application('second', 3),
      ],
      'acme-billing'
    );
    expect(applications.map((a) => a.metadata?.name)).to.deep.equal(['second', 'first']);
  });

  it('finds the decline for an application', () => {
    const declines = [
      { metadata: { name: 'd1' }, spec: { applicationRef: { name: 'a' }, message: 'No' } },
      { metadata: { name: 'd2' }, spec: { applicationRef: { name: 'b' }, message: 'No' } },
    ];
    expect(getDeclineForApplication(declines, 'b')?.metadata?.name).to.equal('d2');
    expect(getDeclineForApplication(declines, 'c')).to.equal(undefined);
  });

  it('formats spend bands in the account currency', () => {
    expect(formatSpendBand('From2500To10000', 'USD')).to.equal('$2,500–$10,000');
    expect(formatSpendBand('Under500', 'USD')).to.equal('< $500');
    expect(formatSpendBand('Over10000', 'EUR')).to.equal('€10,000+');
    expect(formatSpendBand('NotSure', 'USD')).to.equal(undefined);
    expect(formatSpendBand('From500To2500', '')).to.equal('500–2,500');
  });

  it("starts the approval form from the customer's invoice details", () => {
    const values = paymentTermsFormFromApplication(application('a', 1));
    expect(values).to.include({
      netDays: 30,
      creditLimit: '',
      accountsPayableEmail: 'ap@acme.com',
      purchaseOrderNumber: 'PO-4471',
      agreementReference: 'MSA-2026-014',
      reason: '',
    });
  });

  it('starts a renewal when the current terms end', () => {
    const endsAt = new Date(iso(31));
    expect(
      paymentTermsFormFromApplication(application('a', 1), { startsAt: endsAt }).startsAt
    ).to.equal(endsAt);
    expect(paymentTermsFormFromApplication(application('a', 1)).startsAt).to.equal(undefined);
  });

  it('approves the application by naming it on the new terms', () => {
    const values = {
      ...paymentTermsFormFromApplication(application('a', 1)),
      creditLimit: '10000',
      reason: 'Verified company',
    };
    const spec = buildArrangementSpec(values, 'acme-billing', { applicationName: 'a' });
    expect(spec.applicationRef).to.deep.equal({ name: 'a' });
    expect(spec.invoice?.accountsPayableEmail).to.equal('ap@acme.com');
    expect(buildArrangementSpec(values, 'acme-billing')).not.to.have.property('applicationRef');
  });

  it('declines with a message for the customer and optional internal notes', () => {
    expect(declineApplicationFormSchema.safeParse({ message: '  ' }).success).to.equal(false);
    expect(buildDeclineSpec({ message: ' Add a card. ', internalNotes: '  ' }, 'a')).to.deep.equal({
      applicationRef: { name: 'a' },
      message: 'Add a card.',
      internalNotes: undefined,
    });
    expect(buildDeclineSpec({ message: 'No', internalNotes: 'Shell company' }, 'a')).to.include({
      internalNotes: 'Shell company',
    });
  });
});
