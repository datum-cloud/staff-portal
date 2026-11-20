import { buildOnboardingSteps } from './onboarding-steps';
import {
  getBillingAccountDisplayStatus,
  getPaymentMethodsForAccount,
} from '@/features/billing/utils';
import type { GqlOrganization, GqlOrgMember } from '@/resources/gql/organization.gql';
import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1PaymentMethod,
} from '@openapi/billing.miloapis.com/v1alpha1';
import type { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';

/**
 * The organization overview's Account card (#770): one line per fact the old
 * Onboarding, Details, Contact, Members and Billing cards showed. Pure; the
 * component does the rendering.
 */

type BillingAccount = ComMiloapisBillingV1Alpha1BillingAccount;
type PaymentMethod = ComMiloapisBillingV1Alpha1PaymentMethod;
type K8sOrganization = ComMiloapisResourcemanagerV1Alpha1Organization;

export type Address = NonNullable<NonNullable<K8sOrganization['spec']>['contactInfo']>['address'];

/** The organization's own address, or else its (preferably Ready) billing account's. */
export function resolveAddress(
  k8sOrg: K8sOrganization | undefined,
  billingAccounts: readonly BillingAccount[]
): Address | undefined {
  const orgAddress = k8sOrg?.spec?.contactInfo?.address;
  if (orgAddress && (orgAddress.line1 || orgAddress.city || orgAddress.country)) {
    return orgAddress;
  }
  const ready =
    billingAccounts.find((account) => account.status?.phase === 'Ready') ?? billingAccounts[0];
  return ready?.spec?.contactInfo?.address;
}

/** The account the summary reports on: the Ready one, else the first. */
export const primaryBillingAccount = (
  accounts: readonly BillingAccount[]
): BillingAccount | undefined =>
  accounts.find((account) => account.status?.phase === 'Ready') ?? accounts[0];

/** Sole payment method on some billing account is Failed, with nothing to fall back on. */
export const hasFailedSolePaymentMethod = (
  accounts: readonly BillingAccount[],
  methods: readonly PaymentMethod[]
): boolean =>
  accounts.some((account) => {
    const name = account.metadata?.name;
    if (!name) return false;
    const own = getPaymentMethodsForAccount([...methods], name, account.metadata?.namespace);
    return own.length === 1 && own[0].status?.phase === 'Failed';
  });

/** One owner's latest fraud evaluation. */
export interface OwnerFraudScore {
  evaluationName: string;
  score: number;
  decision?: 'ACCEPTED' | 'REVIEW' | 'DEACTIVATE';
}

export interface AccountSummaryInput {
  org?: GqlOrganization | null;
  k8sOrg?: K8sOrganization;
  billingAccounts: readonly BillingAccount[];
  paymentMethods: readonly PaymentMethod[];
  members: readonly GqlOrgMember[];
  ownerScores: readonly OwnerFraudScore[];
}

export interface AccountSummary {
  onboarding: { complete: number; total: number };
  /** Undefined when the organization has no billing account. */
  billing?: { state: string; tooltip?: string; accountName: string };
  /** `None` when the billing account has no payment method. */
  paymentMethod: { state: string };
  /** The highest score among the owners' evaluations; undefined when none has one. */
  fraud?: OwnerFraudScore;
  members: { count: number; owners: number };
  contact: { name?: string; email?: string; location?: string };
}

const paymentMethodState = (
  account: BillingAccount | undefined,
  methods: readonly PaymentMethod[]
): string => {
  const name = account?.metadata?.name;
  if (!name) return 'None';
  const own = getPaymentMethodsForAccount([...methods], name, account.metadata?.namespace);
  if (own.length === 0) return 'None';
  // One working method is enough; otherwise report the first one's phase.
  return (
    own.find((method) => method.status?.phase === 'Active')?.status?.phase ??
    own[0].status?.phase ??
    'Unknown'
  );
};

const highest = (scores: readonly OwnerFraudScore[]): OwnerFraudScore | undefined =>
  scores.reduce<OwnerFraudScore | undefined>(
    (best, score) => (best === undefined || score.score > best.score ? score : best),
    undefined
  );

const trimmed = (...values: (string | null | undefined)[]): string | undefined =>
  values.map((value) => value?.trim()).find(Boolean);

/** Everything the Account card shows, from the data the old cards used. */
export function summarizeAccount(input: AccountSummaryInput): AccountSummary {
  const { org, k8sOrg, billingAccounts, paymentMethods, members, ownerScores } = input;
  const { steps } = buildOnboardingSteps({
    org,
    hasBillingAccount: billingAccounts.length > 0,
    paymentMethodFailed: hasFailedSolePaymentMethod(billingAccounts, paymentMethods),
  });
  const account = primaryBillingAccount(billingAccounts);
  const joined = members.filter((member) => member.type === 'member');
  const address = resolveAddress(k8sOrg, billingAccounts);
  const location = [address?.city, address?.country].filter(Boolean).join(', ');
  const fraud = highest(ownerScores);
  const name = trimmed(org?.contactInfo?.name, k8sOrg?.spec?.contactInfo?.name);
  const email = trimmed(org?.contactInfo?.email, k8sOrg?.spec?.contactInfo?.email);

  return {
    onboarding: {
      complete: steps.filter((step) => step.state === 'complete').length,
      total: steps.length,
    },
    ...(account?.metadata?.name && {
      billing: {
        ...getBillingAccountDisplayStatus(account, [...paymentMethods]),
        accountName: account.metadata.name,
      },
    }),
    paymentMethod: { state: paymentMethodState(account, paymentMethods) },
    ...(fraud && { fraud }),
    members: {
      count: joined.length,
      owners: joined.filter((member) => member.roles?.includes('owner')).length,
    },
    contact: {
      ...(name && { name }),
      ...(email && { email }),
      ...(location && { location }),
    },
  };
}

/** Owners who have joined and have a user, whose fraud scores count. */
export const ownerUserNames = (members: readonly GqlOrgMember[]): string[] =>
  members
    .filter((member) => member.type === 'member' && member.roles?.includes('owner'))
    .map((member) => member.userName)
    .filter((name): name is string => Boolean(name));
