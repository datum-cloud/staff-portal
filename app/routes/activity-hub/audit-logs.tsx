import type { Route } from './+types/audit-logs';
import { createActivityClientConfig } from '@/features/activity/lib/activity-client';
import { metaObject } from '@/utils/helpers';
import { AuditLogQueryComponent, ActivityApiClient } from '@datum-cloud/activity-ui';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';

const clientConfig = createActivityClientConfig();

export const handle = {
  breadcrumb: () => <Trans>Audit Logs</Trans>,
};

export const meta: Route.MetaFunction = () => metaObject(t`Audit Logs`);

export default function AuditLogsPage() {
  const client = new ActivityApiClient(clientConfig);

  return (
    <div className="p-4">
      <AuditLogQueryComponent client={client} className="shadow-none" />
    </div>
  );
}
