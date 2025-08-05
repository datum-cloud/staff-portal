import { useOrganizationDetailData, getOrganizationDetailMetadata } from '../shared';
import type { Route } from './+types/activity';
import { ActivityList } from '@/features/activity';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';

export const handle = {
  breadcrumb: () => <Trans>Activity</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Activity - ${organizationName}`);
};

export default function Page() {
  const data = useOrganizationDetailData();

  return (
    <ActivityList
      resourceType="organization"
      resourceId={data.metadata.name}
      queryKeyPrefix={['organizations', data.metadata.name, 'activity']}
    />
  );
}
