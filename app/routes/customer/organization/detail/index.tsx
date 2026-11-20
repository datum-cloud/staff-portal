import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/index';
import { DangerZoneCard } from '@/components/danger-zone-card';
import {
  OrgAccountCard,
  OrgHealthStrip,
  OrgNeedsAttention,
  OrgProjectsCard,
  OrgRecentChanges,
  OrgUsageCard,
  OrgWarningEvents,
} from '@/features/organization';
import { orgDeleteMutation, useOrganizationQuery } from '@/resources/request/client';
import { orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
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
  const gqlOrg = orgQuery.data ?? undefined;

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

  // Layout from the #764 mockup: the strip across the top, problems in the main
  // column, the organization's static data in a narrow side column. Below `lg`
  // the side column drops under the main one.
  return (
    <div className="m-4 flex flex-col gap-4">
      <OrgHealthStrip orgName={orgName} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <OrgNeedsAttention orgName={orgName} />
          <OrgWarningEvents orgName={orgName} />
          <OrgUsageCard orgName={orgName} />
        </div>
        <aside className="flex flex-col gap-4 lg:w-96 lg:shrink-0">
          <OrgProjectsCard orgName={orgName} />
          <OrgRecentChanges orgName={orgName} />
          <OrgAccountCard orgName={orgName} k8sOrg={k8sOrg} />
        </aside>
      </div>

      <DangerZoneCard
        deleteTitle={t`Delete Organization`}
        deleteDescription={t`Permanently delete this organization and all associated data`}
        dialogTitle={t`Delete Organization`}
        dialogDescription={t`Are you sure you want to delete organization "${displayNameForDelete} (${orgName})"? This action cannot be undone.`}
        onConfirm={handleDeleteOrganization}
      />
    </div>
  );
}
