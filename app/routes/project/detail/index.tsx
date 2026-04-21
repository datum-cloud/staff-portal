import { getProjectDetailMetadata, useProjectDetailData } from '../shared';
import type { Route } from './+types/index';
import { DangerZoneCard } from '@/components/danger-zone-card';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { PageHeader } from '@/components/page-header';
import { projectDeleteMutation } from '@/resources/request/client';
import { orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link, useNavigate } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Detail - ${projectName}`);
};

export default function Page() {
  const { project, organization } = useProjectDetailData();
  const { t } = useLingui();
  const navigate = useNavigate();

  const handleDeleteProject = async () => {
    await projectDeleteMutation(project?.metadata?.name ?? '');
    navigate(projectRoutes.list());
    toast.success(t`Project deleted successfully`);
  };

  return (
    <div className="m-4 flex flex-col gap-1">
      <PageHeader title={project?.metadata?.annotations?.['kubernetes.io/description']} />

      <Card className="mt-4 shadow-none">
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
