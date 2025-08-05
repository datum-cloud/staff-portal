import { useProjectDetailData, getProjectDetailMetadata } from '../shared';
import type { Route } from './+types/activity';
import { ActivityList } from '@/features/activity';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Activity</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Activity - ${projectName}`);
};

export default function Page() {
  const { project } = useProjectDetailData();

  return (
    <ActivityList
      resourceType="project"
      resourceId={project.metadata.name}
      queryKeyPrefix={['projects', project.metadata.name, 'activity']}
    />
  );
}
