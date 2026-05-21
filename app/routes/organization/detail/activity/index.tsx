import { useOrganizationDetailData, getOrganizationDetailMetadata } from '../../shared';
import type { Route } from './+types/index';
import { MultiSourceActivityFeed } from '@/features/activity/components/MultiSourceActivityFeed';
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
  const organizationName = data.metadata?.name ?? '';

  return (
    <MultiSourceActivityFeed
      orgName={organizationName}
      pageSize={50}
      className="bg-card border-border border"
    />
  );
}
