import {
  hasFailedSolePaymentMethod,
  ownerUserNames,
  summarizeAccount,
  type AccountSummary,
  type OwnerFraudScore,
} from '../lib/account-summary';
import type { GqlOrganization } from '@/resources/gql/organization.gql';
import {
  useBillingAccountListForOrgQuery,
  useOrganizationQuery,
  useOrgMemberListQuery,
  usePaymentMethodListForOrgQuery,
  useUserFraudEvaluationQueries,
} from '@/resources/request/client';
import type { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { useMemo } from 'react';

/** Which parts of the summary are still loading, so each row can show its own skeleton. */
export interface AccountSummaryLoading {
  org: boolean;
  billing: boolean;
  members: boolean;
  fraud: boolean;
}

/** What the full Onboarding card needs, for the dialog the Onboarding row opens. */
export interface OnboardingDetails {
  org: GqlOrganization | null | undefined;
  hasBillingAccount: boolean;
  paymentMethodFailed: boolean;
}

export interface OrgAccountSummary {
  summary: AccountSummary;
  onboarding: OnboardingDetails;
  loading: AccountSummaryLoading;
}

/**
 * Everything the overview's Account card shows (#770): the organization,
 * its billing accounts and payment methods, its members, and the latest fraud
 * evaluation of each owner. The billing and member queries are the ones the
 * old cards used, so their cache carries over.
 */
export function useOrgAccountSummary(
  orgName: string,
  k8sOrg: ComMiloapisResourcemanagerV1Alpha1Organization | undefined
): OrgAccountSummary {
  const orgQuery = useOrganizationQuery(orgName);
  const billingQuery = useBillingAccountListForOrgQuery(orgName);
  const paymentMethodsQuery = usePaymentMethodListForOrgQuery(orgName);
  const membersQuery = useOrgMemberListQuery(orgName);

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const owners = useMemo(() => ownerUserNames(members), [members]);
  const fraudResults = useUserFraudEvaluationQueries(owners);

  // `useQueries` returns a new array every render; rebuild only on real changes.
  const fraudKey = fraudResults.map((r) => `${r.status}:${r.dataUpdatedAt}`).join('|');
  const ownerScores = useMemo(
    () =>
      fraudResults.flatMap((result): OwnerFraudScore[] => {
        const latest = result.data?.items?.[0];
        const score = Number(latest?.status?.compositeScore);
        if (!latest?.metadata?.name || !Number.isFinite(score)) return [];
        return [
          {
            evaluationName: latest.metadata.name,
            score,
            ...(latest.status?.decision && { decision: latest.status.decision }),
          },
        ];
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fraudKey` tracks `fraudResults`
    [fraudKey]
  );

  const summary = useMemo(
    () =>
      summarizeAccount({
        org: orgQuery.data,
        k8sOrg,
        billingAccounts: billingQuery.data?.items ?? [],
        paymentMethods: paymentMethodsQuery.data?.items ?? [],
        members,
        ownerScores,
      }),
    [orgQuery.data, k8sOrg, billingQuery.data, paymentMethodsQuery.data, members, ownerScores]
  );

  const onboarding = useMemo(
    () => ({
      org: orgQuery.data,
      hasBillingAccount: (billingQuery.data?.items ?? []).length > 0,
      paymentMethodFailed: hasFailedSolePaymentMethod(
        billingQuery.data?.items ?? [],
        paymentMethodsQuery.data?.items ?? []
      ),
    }),
    [orgQuery.data, billingQuery.data, paymentMethodsQuery.data]
  );

  return {
    summary,
    onboarding,
    loading: {
      org: orgQuery.isPending,
      billing: billingQuery.isPending || paymentMethodsQuery.isPending,
      members: membersQuery.isPending,
      fraud: membersQuery.isPending || fraudResults.some((result) => result.isPending),
    },
  };
}
