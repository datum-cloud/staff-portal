import { useOrganizationDetailData } from '../../shared';
import { ActivityLayout } from '@/components/activity-layout';
import { orgRoutes } from '@/utils/config/routes.config';

export default function OrganizationActivityLayout() {
  const data = useOrganizationDetailData();
  const organizationName = data.metadata?.name ?? '';

  return <ActivityLayout basePath={orgRoutes.activity.root(organizationName)} />;
}
