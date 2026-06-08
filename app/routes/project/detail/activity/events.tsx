import { useProjectDetailData } from '../../shared';
import type { Route } from './+types/events';
import {
  createActivityClientConfig,
  getProjectControlPlanePath,
} from '@/features/activity/lib/activity-client';
import { metaObject } from '@/utils/helpers';
import { EventsFeed, ActivityApiClient } from '@datum-cloud/activity-ui';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

export const handle = {
  breadcrumb: () => <Trans>Events</Trans>,
};

export const meta: Route.MetaFunction = () => metaObject(t`Events`);

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project?.metadata?.name ?? '';

  const client = useMemo(
    () =>
      new ActivityApiClient(createActivityClientConfig(getProjectControlPlanePath(projectName))),
    [projectName]
  );

  return (
    <div className="p-4">
      <EventsFeed client={client} pageSize={50} className="shadow-none" />
    </div>
  );
}
