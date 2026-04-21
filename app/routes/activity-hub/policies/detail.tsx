import { createActivityClientConfig } from '@/features/activity/lib/activity-client';
import { staffResourceLinkResolver } from '@/features/activity/lib/activity-link-resolvers';
import { activityRoutes } from '@/utils/config/routes.config';
import { PolicyEditor, ActivityApiClient } from '@datum-cloud/activity-ui';
import type { ResourceRef } from '@datum-cloud/activity-ui';
import { useParams, useNavigate } from 'react-router';

// Create client with proxy URL - no loader needed
const clientConfig = createActivityClientConfig();

/**
 * Policy Detail/Editor Page
 */
export default function PolicyDetailPage() {
  const { policyName } = useParams<{ policyName: string }>();
  const navigate = useNavigate();

  // Initialize client in browser with proxy URL
  const client = new ActivityApiClient(clientConfig);

  // Determine if creating new policy
  const isNew = policyName === 'new';

  // Handle save success - navigate back to list
  const handleSaveSuccess = () => {
    navigate(activityRoutes.policies.list());
  };

  // Handle cancel - navigate back to list
  const handleCancel = () => {
    navigate(activityRoutes.policies.list());
  };

  // Handle resource click in preview - navigate to resource page
  const handleResourceClick = (resource: ResourceRef) => {
    // Policy preview doesn't have tenant context, so resource links won't resolve
    // This is expected behavior - pass empty context for type safety
    const url = staffResourceLinkResolver(resource, {});
    if (url) {
      navigate(url);
    }
  };

  return (
    <PolicyEditor
      client={client}
      policyName={isNew ? undefined : policyName}
      onSaveSuccess={handleSaveSuccess}
      onCancel={handleCancel}
      onResourceClick={handleResourceClick}
      className="bg-card border-border border"
    />
  );
}
