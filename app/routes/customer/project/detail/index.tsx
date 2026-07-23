import { getProjectDetailMetadata, useProjectDetailData } from '../shared';
import type { Route } from './+types/index';
import { DangerZoneCard } from '@/components/danger-zone-card';
import {
  ProjectBillingCard,
  ProjectDetailsCard,
  ProjectOrganizationCard,
  ProjectQuotasCard,
  ProjectResourcesCard,
  ProjectUsageCard,
} from '@/features/project';
import { projectDeleteMutation } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useLingui } from '@lingui/react/macro';
import { useNavigate } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Overview - ${projectName}`);
};

export default function Page() {
  const { project, organization } = useProjectDetailData();
  const { t } = useLingui();
  const navigate = useNavigate();
  const orgName = organization?.metadata?.name ?? '';
  const projectName = project?.metadata?.name ?? '';
  const displayNameForDelete =
    project?.metadata?.annotations?.['kubernetes.io/description']?.trim() || projectName;

  const handleDeleteProject = async () => {
    await projectDeleteMutation(projectName);
    navigate(projectRoutes.list());
    toast.success(t`Project deleted successfully`);
  };

  return (
    <div className="m-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ProjectDetailsCard className="h-full" project={project} />
      <ProjectOrganizationCard className="h-full" organization={organization} />
      <ProjectBillingCard className="h-full" orgName={orgName} projectName={projectName} />
      <ProjectResourcesCard className="h-full" projectName={projectName} />
      <ProjectQuotasCard className="h-full" projectName={projectName} />
      <ProjectUsageCard className="h-full" orgName={orgName} projectName={projectName} />

      <div className="lg:col-span-2">
        <DangerZoneCard
          deleteTitle={t`Delete Project`}
          deleteDescription={t`Permanently delete this project and all associated data`}
          dialogTitle={t`Delete Project`}
          dialogDescription={t`Are you sure you want to delete project "${displayNameForDelete} (${projectName})"? This action cannot be undone.`}
          onConfirm={handleDeleteProject}
        />
      </div>
    </div>
  );
}
