import { buildOnboardingSteps } from './onboarding-steps';
import type { GqlOrganization } from '@/modules/graphql/organizations';
import { describe, expect, it } from 'bun:test';

function org(partial: Partial<GqlOrganization>): GqlOrganization {
  return {
    name: 'org-test',
    displayName: 'Test',
    type: 'Standard',
    createdAt: null,
    state: null,
    contactInfo: null,
    onboardingComplete: false,
    onboardingStatus: 'Inactive',
    entityType: 'Individual',
    onboardingReason: null,
    onboardingMessage: null,
    projectCount: 0,
    hasMoreProjects: false,
    ...partial,
  };
}

describe('buildOnboardingSteps', () => {
  it('marks all steps complete when onboarded', () => {
    const result = buildOnboardingSteps({
      org: org({
        onboardingComplete: true,
        onboardingStatus: 'Active',
        onboardingReason: 'Complete',
      }),
      hasBillingAccount: true,
    });
    expect(result.steps.every((s) => s.state === 'complete')).toBe(true);
    expect(result.waitingMessage).toBeNull();
  });

  it('highlights payment when reason is PaymentMethodMissing', () => {
    const result = buildOnboardingSteps({
      org: org({
        contactInfo: { businessName: 'Acme', name: 'Ada', email: 'a@acme.test' },
        entityType: 'Company',
        onboardingReason: 'PaymentMethodMissing',
        onboardingMessage: 'Need a card',
      }),
      hasBillingAccount: true,
    });
    expect(result.steps.find((s) => s.id === 'payment')?.state).toBe('current');
    expect(result.steps.find((s) => s.id === 'contact')?.state).toBe('complete');
    expect(result.waitingMessage).toBe('Need a card');
  });

  it('starts at contact when contact info is missing', () => {
    const result = buildOnboardingSteps({
      org: org({ contactInfo: null }),
      hasBillingAccount: false,
    });
    expect(result.steps.find((s) => s.id === 'contact')?.state).toBe('current');
  });
});
