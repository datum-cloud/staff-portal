import { useUserDetailData } from '../../shared';
import { ActivityLayout } from '@/components/activity-layout';
import { userRoutes } from '@/utils/config/routes.config';

export default function UserActivityLayout() {
  const data = useUserDetailData();
  const userId = data.metadata?.name ?? '';

  return <ActivityLayout basePath={userRoutes.activity(userId)} />;
}
