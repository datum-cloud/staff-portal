import { createActivityClientConfig } from '@/features/activity/lib/activity-client';
import { activityRoutes } from '@/utils/config/routes.config';
import { PolicyList, ActivityApiClient } from '@datum-cloud/activity-ui';
import { useNavigate } from 'react-router';

// Create client with proxy URL - no loader needed
const clientConfig = createActivityClientConfig();

/**
 * Manage Policies Tab - Policy List View
 */
export default function PoliciesIndexPage() {
  const navigate = useNavigate();

  // Initialize client in browser with proxy URL
  const client = new ActivityApiClient(clientConfig);

  // Handle edit policy - navigate to detail route
  const handleEditPolicy = (policyName: string) => {
    navigate(activityRoutes.policies.detail(policyName));
  };

  // Handle create policy - navigate to detail route with "new" name
  const handleCreatePolicy = () => {
    navigate(activityRoutes.policies.create());
  };

  return (
    <PolicyList
      client={client}
      onEditPolicy={handleEditPolicy}
      onCreatePolicy={handleCreatePolicy}
      groupByApiGroup={true}
      className="bg-card border-border border"
    />
  );
}
