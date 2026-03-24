import { useUserDetailData } from '../../shared';
import {
  createActivityClientConfig,
  getUserControlPlanePath,
} from '@/features/activity/lib/activity-client';
import { AuditLogQueryComponent, ActivityApiClient } from '@datum-cloud/activity-ui';
import { useMemo } from 'react';

export default function Page() {
  const data = useUserDetailData();
  const userId = data.metadata?.name ?? '';
  const client = useMemo(
    () => new ActivityApiClient(createActivityClientConfig(getUserControlPlanePath(userId))),
    [userId]
  );

  return <AuditLogQueryComponent client={client} className="bg-card border-border border" />;
}
