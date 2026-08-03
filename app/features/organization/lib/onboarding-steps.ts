import type { GqlOrganization } from '@/modules/graphql/organizations';

export type OnboardingStepId = 'contact' | 'billing' | 'payment' | 'complete';

export type OnboardingStepState = 'complete' | 'current' | 'failed' | 'upcoming';

export type OnboardingStep = {
  id: OnboardingStepId;
  state: OnboardingStepState;
};

export type OnboardingStepsResult = {
  steps: OnboardingStep[];
  /** Human-facing copy for the blocked step when not fully onboarded. */
  waitingMessage: string | null;
};

const REASON_STEP: Record<string, OnboardingStepId> = {
  ContactInfoMissing: 'contact',
  ContactDetailsMissing: 'contact',
  BillingAccountMissing: 'billing',
  PaymentMethodMissing: 'payment',
  Complete: 'complete',
};

function hasContactDetails(org: GqlOrganization | null | undefined): boolean {
  const contact = org?.contactInfo;
  if (!contact) return false;
  return Boolean(contact.email?.trim() || contact.name?.trim() || contact.businessName?.trim());
}

/**
 * Builds a 4-step onboarding timeline from GraphQL org fields + whether a
 * billing account exists. Reasons we know about (e.g. PaymentMethodMissing)
 * pin the “current” step; otherwise we infer from available data.
 *
 * When `paymentMethodFailed` is true (sole PM on the account is Failed), the
 * payment step renders as `failed` instead of `current`.
 */
export function buildOnboardingSteps(input: {
  org: GqlOrganization | null | undefined;
  hasBillingAccount: boolean;
  /** Sole payment method on a billing account is Failed. */
  paymentMethodFailed?: boolean;
}): OnboardingStepsResult {
  const { org, hasBillingAccount, paymentMethodFailed = false } = input;
  const complete = org?.onboardingComplete === true;
  const reason = org?.onboardingReason ?? null;
  const message = org?.onboardingMessage ?? null;

  if (complete) {
    return {
      steps: [
        { id: 'contact', state: 'complete' },
        { id: 'billing', state: 'complete' },
        { id: 'payment', state: 'complete' },
        { id: 'complete', state: 'complete' },
      ],
      waitingMessage: null,
    };
  }

  const contactDone = hasContactDetails(org);
  const billingDone = hasBillingAccount;

  let current: OnboardingStepId =
    REASON_STEP[reason ?? ''] ?? (!contactDone ? 'contact' : !billingDone ? 'billing' : 'payment');

  // If reason says Complete but status is False, keep payment as the wait.
  if (current === 'complete') current = 'payment';

  const order: OnboardingStepId[] = ['contact', 'billing', 'payment', 'complete'];
  const currentIndex = order.indexOf(current);

  const steps: OnboardingStep[] = order.map((id, index) => {
    if (id === 'complete') return { id, state: 'upcoming' };
    if (index < currentIndex) return { id, state: 'complete' };
    if (index === currentIndex) {
      if (id === 'payment' && paymentMethodFailed) return { id, state: 'failed' };
      return { id, state: 'current' };
    }
    return { id, state: 'upcoming' };
  });

  // Heuristic: mark earlier data-backed steps complete even if reason skips ahead.
  if (contactDone && steps[0].state !== 'complete' && current !== 'contact') {
    steps[0] = { id: 'contact', state: 'complete' };
  }
  if (billingDone && steps[1].state !== 'complete' && current !== 'billing') {
    steps[1] = { id: 'billing', state: 'complete' };
  }

  const waitingMessage =
    message?.trim() ||
    (paymentMethodFailed
      ? 'Default payment method failed. Add a working payment method to continue.'
      : reason === 'PaymentMethodMissing'
        ? 'Waiting for a ready default payment method on the billing account.'
        : reason
          ? reason
          : 'Onboarding is incomplete.');

  return { steps, waitingMessage };
}
