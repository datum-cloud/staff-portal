import { useOrganizationDetailData } from '../../shared';
import {
  createActivityClientConfig,
  getOrganizationControlPlanePath,
} from '@/features/activity/lib/activity-client';
import { EventsFeed, ActivityApiClient } from '@datum-cloud/activity-ui';
import { useMemo } from 'react';

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

  return <EventsFeed client={client} pageSize={50} className="bg-card border-border border" />;
}
