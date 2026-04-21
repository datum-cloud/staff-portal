import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DangerZoneCard } from '@/components/danger-zone-card';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { PageHeader } from '@/components/page-header';
import { orgDeleteMutation } from '@/resources/request/client';
import { orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { useNavigate } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Overview - ${organizationName}`);
};

export default function Page() {
  const { t } = useLingui();
  const data = useOrganizationDetailData();
  const navigate = useNavigate();

  const handleDeleteOrganization = async () => {
    await orgDeleteMutation(data.metadata?.name ?? '');
    navigate(orgRoutes.list());
    toast.success(t`Organization deleted successfully`);
  };

  return (
    <div className="m-4 flex flex-col gap-1">
      <PageHeader title={data?.metadata?.annotations?.['kubernetes.io/display-name']} />

      <Card className="mt-4 shadow-none">
        <CardContent>
          <DescriptionList
            items={[
              {
                label: <Trans>Description</Trans>,
                value: <Text>{data?.metadata?.annotations?.['kubernetes.io/display-name']}</Text>,
              },
              {
                label: <Trans>Name</Trans>,
                value: <Text>{data?.metadata?.name}</Text>,
              },
              {
                label: <Trans>Type</Trans>,
                value: <BadgeState state={data?.spec?.type ?? 'Organization'} />,
              },
              {
                label: <Trans>Created</Trans>,
                value: (
                  <Text>
                    <DateTime date={data?.metadata?.creationTimestamp} variant="both" />
                  </Text>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <DangerZoneCard
        deleteTitle={t`Delete Organization`}
        deleteDescription={t`Permanently delete this organization and all associated data`}
        dialogTitle={t`Delete Organization`}
        dialogDescription={t`Are you sure you want to delete organization "${data.metadata?.annotations?.['kubernetes.io/display-name'] ?? ''} (${data.metadata?.name ?? ''})"? This action cannot be undone.`}
        onConfirm={handleDeleteOrganization}
      />
    </div>
  );
}
