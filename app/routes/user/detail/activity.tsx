import { useUserDetailData, getUserDetailMetadata } from '../shared';
import type { Route } from './+types/activity';
import { ActivityList } from '@/features/activity';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Activity</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { userName } = getUserDetailMetadata(matches);
  return metaObject(`Activity - ${userName}`);
};

export default function Page() {
  const data = useUserDetailData();

  return (
    <ActivityList
      resourceType="user"
      resourceId={data.spec.email}
      queryKeyPrefix={['users', data.metadata.name, 'activity']}
    />
  );
}
