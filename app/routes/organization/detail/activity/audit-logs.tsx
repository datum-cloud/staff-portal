import { useOrganizationDetailData } from '../../shared';
import {
  createActivityClientConfig,
  getOrganizationControlPlanePath,
} from '@/features/activity/lib/activity-client';
import { AuditLogQueryComponent, ActivityApiClient } from '@datum-cloud/activity-ui';
import { useMemo } from 'react';

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

  return <AuditLogQueryComponent client={client} className="bg-card border-border border" />;
}
