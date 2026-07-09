import { getProjectDetailMetadata, useProjectDetailData } from '../shared';
import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DangerZoneCard } from '@/components/danger-zone-card';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { getActiveProjectBinding, getBillingAccountDisplayName } from '@/features/billing/utils';
import {
  useBillingAccountBindingListForOrgQuery,
  useBillingAccountListForOrgQuery,
  projectDeleteMutation,
} from '@/resources/request/client';
import { billingAccountRoutes, orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Detail - ${projectName}`);
};

export default function Page() {
  const { project, organization } = useProjectDetailData();
  const { t } = useLingui();
  const navigate = useNavigate();
  const orgName = organization?.metadata?.name ?? '';
  const projectName = project?.metadata?.name ?? '';

  const { data: bindingsData } = useBillingAccountBindingListForOrgQuery(orgName);
  const { data: accountsData } = useBillingAccountListForOrgQuery(orgName);

  const billingValue = useMemo(() => {
    const bindings = bindingsData?.items ?? [];
    const accounts = accountsData?.items ?? [];
    const activeBinding = getActiveProjectBinding(bindings, projectName);
    const accountName = activeBinding?.spec?.billingAccountRef?.name ?? '';
    const account = accounts.find((item) => item.metadata?.name === accountName);

    if (account) {
      return (
        <Link
          to={billingAccountRoutes.detail(orgName, account.metadata?.name ?? '')}
          className="inline-flex items-center gap-2 hover:underline">
          {getBillingAccountDisplayName(account)}
          <BadgeState state={account.status?.phase ?? 'Unknown'} />
        </Link>
      );
    }

    if (accountName) {
      return (
        <span>
          {accountName} <Trans>(cross-org)</Trans>
        </span>
      );
    }

    return t`No billing account assigned`;
  }, [accountsData?.items, bindingsData?.items, orgName, projectName, t]);

  const handleDeleteProject = async () => {
    await projectDeleteMutation(project?.metadata?.name ?? '');
    navigate(projectRoutes.list());
    toast.success(t`Project deleted successfully`);
  };

  return (
    <div className="m-4 flex flex-col gap-1">
      <Card className="shadow-none">
        <CardContent>
          <DescriptionList
            items={[
              {
                label: <Trans>Description</Trans>,
                value: <Text>{project?.metadata?.annotations?.['kubernetes.io/description']}</Text>,
              },
              {
                label: <Trans>Name</Trans>,
                value: <Text>{project?.metadata?.name}</Text>,
              },
              {
                label: <Trans>Organization</Trans>,
                value: (
                  <Link to={orgRoutes.detail(organization?.metadata?.name ?? '')}>
                    {organization?.metadata?.annotations?.['kubernetes.io/display-name']}
                  </Link>
                ),
              },
              {
                label: <Trans>Billing account</Trans>,
                value: billingValue,
              },
              {
                label: <Trans>Created</Trans>,
                value: (
                  <Text>
                    <DateTime date={project?.metadata?.creationTimestamp} variant="both" />
                  </Text>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <DangerZoneCard
        deleteTitle={t`Delete Project`}
        deleteDescription={t`Permanently delete this project and all associated data`}
        dialogTitle={t`Delete Project`}
        dialogDescription={t`Are you sure you want to delete project "${project?.metadata?.annotations?.['kubernetes.io/description']} (${project?.metadata?.name ?? ''})"? This action cannot be undone.`}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}
