import type { Route } from './+types/detail';
import { createActivityClientConfig } from '@/features/activity/lib/activity-client';
import { staffResourceLinkResolver } from '@/features/activity/lib/activity-link-resolvers';
import { activityRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { PolicyEditor, ActivityApiClient } from '@datum-cloud/activity-ui';
import type { ResourceRef } from '@datum-cloud/activity-ui';
import { t } from '@lingui/core/macro';
import { useParams, useNavigate } from 'react-router';

const clientConfig = createActivityClientConfig();

export const handle = {
  breadcrumb: ({ params }: { params: { policyName: string } }) => (
    <span>{params.policyName === 'new' ? t`New Policy` : params.policyName}</span>
  ),
};

export const meta: Route.MetaFunction = ({ params }) =>
  metaObject(params.policyName === 'new' ? t`New Policy` : (params.policyName ?? t`Policy`));

/**
 * Policy Detail/Editor Page
 */
export default function PolicyDetailPage() {
  const { policyName } = useParams<{ policyName: string }>();
  const navigate = useNavigate();

  const client = new ActivityApiClient(clientConfig);

  const isNew = policyName === 'new';

  const handleSaveSuccess = () => {
    navigate(activityRoutes.policies.list());
  };

  const handleCancel = () => {
    navigate(activityRoutes.policies.list());
  };

  const handleResourceClick = (resource: ResourceRef) => {
    const url = staffResourceLinkResolver(resource, {});
    if (url) {
      navigate(url);
    }
  };

  return (
    <div className="p-4">
      <PolicyEditor
        client={client}
        policyName={isNew ? undefined : policyName}
        onSaveSuccess={handleSaveSuccess}
        onCancel={handleCancel}
        onResourceClick={handleResourceClick}
        className="shadow-none"
      />
    </div>
  );
}
