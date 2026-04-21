import { useProjectDetailData } from '../../shared';
import { ActivityLayout } from '@/components/activity-layout';
import { projectRoutes } from '@/utils/config/routes.config';

export default function ProjectActivityLayout() {
  const { project } = useProjectDetailData();
  const projectName = project?.metadata?.name ?? '';

  return <ActivityLayout basePath={projectRoutes.activity.root(projectName)} />;
}
