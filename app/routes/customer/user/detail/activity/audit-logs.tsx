import { useUserDetailData } from '../../shared';
import type { Route } from './+types/audit-logs';
import {
  createActivityClientConfig,
  getUserControlPlanePath,
} from '@/features/activity/lib/activity-client';
import { metaObject } from '@/utils/helpers';
import { AuditLogQueryComponent, ActivityApiClient } from '@datum-cloud/activity-ui';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';

export const handle = {
  breadcrumb: () => <Trans>Audit Logs</Trans>,
};

export const meta: Route.MetaFunction = () => metaObject(t`Audit Logs`);

export default function Page() {
  const data = useUserDetailData();
  const userId = data.metadata?.name ?? '';
  const client = useMemo(
    () => new ActivityApiClient(createActivityClientConfig(getUserControlPlanePath(userId))),
    [userId]
  );

  return (
    <div className="p-4">
      <AuditLogQueryComponent client={client} className="shadow-none" />
    </div>
  );
}
