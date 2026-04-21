import { useUserDetailData, getUserDetailMetadata } from '../../shared';
import type { Route } from './+types/index';
import {
  createActivityClientConfig,
  getUserControlPlanePath,
} from '@/features/activity/lib/activity-client';
import {
  staffResourceLinkResolver,
  staffTenantLinkResolver,
} from '@/features/activity/lib/activity-link-resolvers';
import { metaObject } from '@/utils/helpers';
import {
  ActivityFeed,
  ActivityApiClient,
  TenantBadge,
  type Tenant,
} from '@datum-cloud/activity-ui';
import { Trans } from '@lingui/react/macro';
import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Activity</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { userName } = getUserDetailMetadata(matches);
  return metaObject(`Activity - ${userName}`);
};

export default function Page() {
  const data = useUserDetailData();
  const navigate = useNavigate();

  const userId = data.metadata?.name ?? '';
  const client = useMemo(
    () => new ActivityApiClient(createActivityClientConfig(getUserControlPlanePath(userId))),
    [userId]
  );

  const handleTenantClick = useCallback(
    (tenant: Tenant, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const url = staffTenantLinkResolver(tenant);
      if (url) {
        navigate(url);
      }
    },
    [navigate]
  );

  const renderTenant = useCallback(
    (tenant: Tenant) => {
      const url = staffTenantLinkResolver(tenant);
      return (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => handleTenantClick(tenant, e)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleTenantClick(tenant, e as unknown as React.MouseEvent);
            }
          }}
          className={url ? 'cursor-pointer' : ''}
          style={{ pointerEvents: 'auto' }}>
          <TenantBadge tenant={tenant} size="compact" />
        </div>
      );
    },
    [handleTenantClick]
  );

  return (
    <ActivityFeed
      client={client}
      tenantRenderer={renderTenant}
      resourceLinkResolver={staffResourceLinkResolver}
      compact={true}
      pageSize={50}
      className="bg-card border-border border"
    />
  );
}
