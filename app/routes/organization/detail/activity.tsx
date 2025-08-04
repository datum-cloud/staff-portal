import type { Route } from './+types/activity';
import { ActivityList } from '@/features/activity';
import { Organization } from '@/resources/schemas';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Activity</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Organization>(matches, 'routes/organization/detail/layout');
  return metaObject(`Activity - ${data?.metadata?.name}`);
};

export default function Page() {
  const data = useRouteLoaderData('routes/organization/detail/layout') as Organization;

  return (
    <ActivityList
      resourceType="organization"
      resourceId={data.metadata.name}
      queryKeyPrefix={['organizations', data.metadata.name, 'activity']}
    />
  );
}
