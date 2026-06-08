import type { Route } from './+types/index';
import { createActivityClientConfig } from '@/features/activity/lib/activity-client';
import { activityRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { PolicyList, ActivityApiClient } from '@datum-cloud/activity-ui';
import { t } from '@lingui/core/macro';
import { useNavigate } from 'react-router';

const clientConfig = createActivityClientConfig();

export const meta: Route.MetaFunction = () => metaObject(t`Policies`);

/**
 * Policies tab — list view.
 */
export default function PoliciesIndexPage() {
  const navigate = useNavigate();

  const client = new ActivityApiClient(clientConfig);

  const handleEditPolicy = (policyName: string) => {
    navigate(activityRoutes.policies.detail(policyName));
  };

  const handleCreatePolicy = () => {
    navigate(activityRoutes.policies.create());
  };

  return (
    <div className="p-4">
      <PolicyList
        client={client}
        onEditPolicy={handleEditPolicy}
        onCreatePolicy={handleCreatePolicy}
        groupByApiGroup={true}
        className="shadow-none"
      />
    </div>
  );
}
