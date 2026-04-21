import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import {
  createActivityClientConfig,
  getProjectControlPlanePath,
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
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Activity - ${projectName}`);
};

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project?.metadata?.name ?? '';

  const client = useMemo(
    () =>
      new ActivityApiClient(createActivityClientConfig(getProjectControlPlanePath(projectName))),
    [projectName]
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
