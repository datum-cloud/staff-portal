import { useProjectDetailData } from '../../shared';
import {
  createActivityClientConfig,
  getProjectControlPlanePath,
} from '@/features/activity/lib/activity-client';
import { EventsFeed, ActivityApiClient } from '@datum-cloud/activity-ui';
import { useMemo } from 'react';

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project?.metadata?.name ?? '';

  const client = useMemo(
    () =>
      new ActivityApiClient(createActivityClientConfig(getProjectControlPlanePath(projectName))),
    [projectName]
  );

  return <EventsFeed client={client} pageSize={50} className="bg-card border-border border" />;
}
