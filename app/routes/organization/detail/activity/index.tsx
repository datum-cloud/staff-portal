import { useOrganizationDetailData, getOrganizationDetailMetadata } from '../../shared';
import type { Route } from './+types/index';
import {
  createActivityClientConfig,
  getOrganizationControlPlanePath,
} from '@/features/activity/lib/activity-client';
import { staffResourceLinkResolver } from '@/features/activity/lib/activity-link-resolvers';
import { metaObject } from '@/utils/helpers';
import { ActivityFeed, ActivityApiClient } from '@datum-cloud/activity-ui';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

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

  const client = useMemo(
    () =>
      new ActivityApiClient(
        createActivityClientConfig(getOrganizationControlPlanePath(organizationName))
      ),
    [organizationName]
  );

  return (
    <ActivityFeed
      client={client}
      tenantRenderer={() => null}
      resourceLinkResolver={staffResourceLinkResolver}
      compact={true}
      pageSize={50}
      className="bg-card border-border border"
    />
  );
}
