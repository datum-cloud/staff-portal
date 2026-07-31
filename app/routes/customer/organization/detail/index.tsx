import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/index';
import { DangerZoneCard } from '@/components/danger-zone-card';
import { OrgBillingAccountsCard } from '@/features/billing';
import { getPaymentMethodsForAccount } from '@/features/billing/utils';
import {
  OrgContactCard,
  OrgDetailsCard,
  OrgMembersPreviewCard,
  OrgOnboardingCard,
  OrgUsageCard,
} from '@/features/organization';
import {
  orgDeleteMutation,
  useBillingAccountListForOrgQuery,
  useOrganizationQuery,
  useOrgMemberListQuery,
  usePaymentMethodListForOrgQuery,
} from '@/resources/request/client';
import { orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Overview - ${organizationName}`);
};

export default function Page() {
  const { t } = useLingui();
  const k8sOrg = useOrganizationDetailData();
  const navigate = useNavigate();
  const orgName = k8sOrg.metadata?.name ?? '';

  const orgQuery = useOrganizationQuery(orgName);
  const membersQuery = useOrgMemberListQuery(orgName);
  const billingQuery = useBillingAccountListForOrgQuery(orgName);
  const paymentMethodsQuery = usePaymentMethodListForOrgQuery(orgName);

  const gqlOrg = orgQuery.data ?? undefined;
  const billingAccounts = useMemo(() => billingQuery.data?.items ?? [], [billingQuery.data?.items]);
  const paymentMethods = useMemo(
    () => paymentMethodsQuery.data?.items ?? [],
    [paymentMethodsQuery.data?.items]
  );

  /** Sole PM on a billing account is Failed — no other methods to fall back on. */
  const paymentMethodFailed = useMemo(
    () =>
      billingAccounts.some((account) => {
        const accountName = account.metadata?.name;
        if (!accountName) return false;
        const methods = getPaymentMethodsForAccount(
          paymentMethods,
          accountName,
          account.metadata?.namespace
        );
        return methods.length === 1 && methods[0].status?.phase === 'Failed';
      }),
    [billingAccounts, paymentMethods]
  );

  const handleDeleteOrganization = async () => {
    await orgDeleteMutation(orgName);
    navigate(orgRoutes.list());
    toast.success(t`Organization deleted successfully`);
  };

  const displayNameForDelete =
    gqlOrg?.contactInfo?.businessName ||
    gqlOrg?.displayName ||
    k8sOrg?.metadata?.annotations?.['kubernetes.io/display-name'] ||
    orgName;

  return (
    <div className="m-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <OrgOnboardingCard
        className="h-full"
        org={gqlOrg}
        hasBillingAccount={billingAccounts.length > 0}
        paymentMethodFailed={paymentMethodFailed}
        isLoading={orgQuery.isPending}
      />

      <OrgUsageCard className="h-full" orgName={orgName} />

      <OrgDetailsCard
        className="h-full"
        org={gqlOrg}
        k8sOrg={k8sOrg}
        isLoading={orgQuery.isPending}
      />

      <OrgContactCard
        className="h-full"
        org={gqlOrg}
        k8sOrg={k8sOrg}
        billingAccounts={billingAccounts}
        isLoading={orgQuery.isPending || billingQuery.isPending}
      />

      <OrgMembersPreviewCard
        className="h-full"
        orgName={orgName}
        members={membersQuery.data ?? []}
        isLoading={membersQuery.isPending}
      />

      <OrgBillingAccountsCard className="mt-0 h-full" orgName={orgName} />

      <div className="lg:col-span-2">
        <DangerZoneCard
          deleteTitle={t`Delete Organization`}
          deleteDescription={t`Permanently delete this organization and all associated data`}
          dialogTitle={t`Delete Organization`}
          dialogDescription={t`Are you sure you want to delete organization "${displayNameForDelete} (${orgName})"? This action cannot be undone.`}
          onConfirm={handleDeleteOrganization}
        />
      </div>
    </div>
  );
}
