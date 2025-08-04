import type { Route } from './+types/activity';
import { ActivityList } from '@/features/activity';
import { Project } from '@/resources/schemas';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Activity</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Project>(matches, 'routes/project/detail/layout');
  return metaObject(`Activity - ${data?.metadata?.name}`);
};

export default function Page() {
  const data = useRouteLoaderData('routes/project/detail/layout') as Project;

  return (
    <ActivityList
      resourceType="project"
      resourceId={data.metadata.name}
      queryKeyPrefix={['projects', data.metadata.name, 'activity']}
    />
  );
}
