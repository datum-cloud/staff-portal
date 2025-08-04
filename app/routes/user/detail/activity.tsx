import type { Route } from './+types/activity';
import { ActivityList } from '@/features/activity';
import { User } from '@/resources/schemas';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Activity</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<User>(matches, 'routes/user/detail/layout');
  return metaObject(`Activity - ${data?.spec?.givenName} ${data?.spec?.familyName}`);
};

export default function Page() {
  const data = useRouteLoaderData('routes/user/detail/layout') as User;

  return (
    <ActivityList
      resourceType="user"
      resourceId={data.spec.email}
      queryKeyPrefix={['users', data.metadata.name, 'activity']}
    />
  );
}
