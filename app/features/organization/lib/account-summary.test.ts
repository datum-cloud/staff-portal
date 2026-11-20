import { ownerUserNames, summarizeAccount, type AccountSummaryInput } from './account-summary';
import type { GqlOrganization, GqlOrgMember } from '@/resources/gql/organization.gql';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1PaymentMethod,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

const account = (name: string, phase: string): ComMiloapisBillingV1Alpha1BillingAccount =>
  ({
    metadata: { name, namespace: 'organization-acme' },
    status: { phase },
    spec: { contactInfo: { address: { city: 'Austin', country: 'US' } } },
  }) as unknown as ComMiloapisBillingV1Alpha1BillingAccount;

const method = (accountName: string, phase: string): ComMiloapisBillingV1Alpha1PaymentMethod =>
  ({
    metadata: { name: `pm-${phase}`, namespace: 'organization-acme' },
    spec: { billingAccountRef: { name: accountName } },
    status: { phase },
  }) as unknown as ComMiloapisBillingV1Alpha1PaymentMethod;

const member = (userName: string, roles: string[], type = 'member'): GqlOrgMember =>
  ({ userName, roles, type, name: userName }) as unknown as GqlOrgMember;

const input = (over: Partial<AccountSummaryInput> = {}): AccountSummaryInput => ({
  org: {
    onboardingComplete: true,
    contactInfo: { name: ' Michael Costello ', email: 'm@acme.test' },
  } as unknown as GqlOrganization,
  billingAccounts: [account('main', 'Ready')],
  paymentMethods: [method('main', 'Active')],
  members: [member('u1', ['owner']), member('u2', ['editor']), member('u3', ['editor', 'owner'])],
  ownerScores: [],
  ...over,
});

describe('summarizeAccount', () => {
  it('summarizes a fully set-up organization', () => {
    expect(summarizeAccount(input())).toEqual({
      onboarding: { complete: 4, total: 4 },
      billing: { state: 'Ready', accountName: 'main' },
      paymentMethod: { state: 'Active' },
      members: { count: 3, owners: 2 },
      contact: { name: 'Michael Costello', email: 'm@acme.test', location: 'Austin, US' },
    });
  });

  it('picks the highest owner fraud score', () => {
    const summary = summarizeAccount(
      input({
        ownerScores: [
          { evaluationName: 'e1', score: 12, decision: 'ACCEPTED' },
          { evaluationName: 'e2', score: 64, decision: 'REVIEW' },
        ],
      })
    );
    expect(summary.fraud).toEqual({ evaluationName: 'e2', score: 64, decision: 'REVIEW' });
  });

  it('reports no billing account and no payment method', () => {
    const summary = summarizeAccount(input({ billingAccounts: [], paymentMethods: [] }));
    expect(summary.billing).toBeUndefined();
    expect(summary.paymentMethod.state).toBe('None');
  });

  it('shows a failed sole payment method as Failed on the billing account', () => {
    const summary = summarizeAccount(input({ paymentMethods: [method('main', 'Failed')] }));
    expect(summary.paymentMethod.state).toBe('Failed');
    expect(summary.billing?.state).toBe('Failed');
  });

  it("doesn't count pending invitations as members", () => {
    const summary = summarizeAccount(
      input({ members: [member('u1', ['owner']), member('i1', ['owner'], 'invitation')] })
    );
    expect(summary.members).toEqual({ count: 1, owners: 1 });
  });

  it('leaves out contact fields that are empty', () => {
    const summary = summarizeAccount(
      input({
        org: { onboardingComplete: true, contactInfo: { name: ' ' } } as unknown as GqlOrganization,
        billingAccounts: [],
      })
    );
    expect(summary.contact).toEqual({});
  });
});

describe('ownerUserNames', () => {
  it('lists joined owners with a user', () => {
    expect(
      ownerUserNames([
        member('u1', ['owner']),
        member('u2', ['editor']),
        member('', ['owner']),
        member('i1', ['owner'], 'invitation'),
      ])
    ).toEqual(['u1']);
  });
});
