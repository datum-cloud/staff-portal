import { getContactDetailMetadata, useContactDetailData } from '../shared';
import type { Route } from './+types/activity';
import { EmptyState } from '@/components/empty-state';
import {
  createActivityClientConfig,
  getUserControlPlanePath,
} from '@/features/activity/lib/activity-client';
import {
  staffResourceLinkResolver,
  staffTenantLinkResolver,
} from '@/features/activity/lib/activity-link-resolvers';
import { isPlatformUser } from '@/features/contact';
import { ENTITY_ICONS } from '@/utils/config/icons.config';
import { metaObject } from '@/utils/helpers';
import {
  ActivityFeed,
  ActivityApiClient,
  TenantBadge,
  type Tenant,
} from '@datum-cloud/activity-ui';
import { Trans } from '@lingui/react/macro';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';

export const handle = { breadcrumb: () => <Trans>Activity</Trans> };

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Activity - ${contactName}`);
};

/**
 * Contact activity feed (#808). The feed is the linked user's control-plane
 * activity, the same as the user detail Activity tab. A prospect has no linked
 * user and no control plane, so the nav entry is hidden (see layout.tsx) and a
 * direct visit falls back to an empty state.
 */
export default function Page() {
  const detail = useContactDetailData();
  const navigate = useNavigate();

  const linked = isPlatformUser(detail.contact);
  const userId = linked ? (detail.user?.metadata?.name ?? '') : '';

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

  if (!linked) {
    return (
      <div className="m-4">
        <EmptyState
          icon={ENTITY_ICONS.activity}
          title={<Trans>No activity</Trans>}
          description={
            <Trans>
              This contact is not linked to a platform user, so there is no activity to show.
            </Trans>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <ActivityFeed
        client={client}
        tenantRenderer={renderTenant}
        resourceLinkResolver={staffResourceLinkResolver}
        pageSize={50}
        className="shadow-none"
      />
    </div>
  );
}
