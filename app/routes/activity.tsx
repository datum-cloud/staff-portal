import type { Route } from './+types/activity';
import { ActivityList } from '@/features/activity';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const meta: Route.MetaFunction = () => {
  return metaObject('Activity');
};

export const handle = {
  breadcrumb: () => <Trans>Activity</Trans>,
};

export default function Page() {
  return <ActivityList queryKeyPrefix={['activity']} />;
}
