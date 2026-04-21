import { useUserDetailData } from '../../shared';
import { ActivityLayout } from '@/components/activity-layout';
import { userRoutes } from '@/utils/config/routes.config';

export default function UserActivityLayout() {
  const data = useUserDetailData();
  const userId = data.metadata?.name ?? '';
  const basePath = userRoutes.activity.root(userId);

  return (
    <ActivityLayout
      basePath={basePath}
      tabs={[
        { label: 'Activity Feed', value: 'feed', to: basePath },
        { label: 'Audit Logs', value: 'audit-logs', to: userRoutes.activity.auditLogs(userId) },
      ]}
    />
  );
}
