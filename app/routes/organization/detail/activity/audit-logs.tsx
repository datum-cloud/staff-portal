import { useOrganizationDetailData } from '../../shared';
import type { Route } from './+types/audit-logs';
import {
  createActivityClientConfig,
  getOrganizationControlPlanePath,
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
      <AuditLogQueryComponent client={client} className="shadow-none" />
    </div>
  );
}
