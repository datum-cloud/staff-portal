import { useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/events';
import {
  createActivityClientConfig,
  getOrganizationControlPlanePath,
} from '@/features/activity/lib/activity-client';
import { metaObject } from '@/utils/helpers';
import { EventsFeed, ActivityApiClient } from '@datum-cloud/activity-ui';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

export const handle = {
  breadcrumb: () => <Trans>Events</Trans>,
};

export const meta: Route.MetaFunction = () => metaObject(t`Events`);

export default function Page() {
  const data = useOrganizationDetailData();
  const organizationName = data.metadata?.name ?? '';

  const client = useMemo(
    () =>
      new ActivityApiClient(
        createActivityClientConfig(getOrganizationControlPlanePath(organizationName))
      ),
    [organizationName]
  );

  return (
    <div className="p-4">
      <EventsFeed client={client} pageSize={50} className="shadow-none" />
    </div>
  );
}
