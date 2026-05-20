import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import { DnsZoneList, type DnsZoneRow } from '@/features/dns';
import { useProjectDnsListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { useMemo } from 'react';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`DNS - ${projectName}`);
};

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project.metadata?.name ?? '';
  const tableQuery = useProjectDnsListQuery(projectName);

  const rows: DnsZoneRow[] = useMemo(
    () =>
      (tableQuery.data?.items ?? []).map((dnsZone) => ({
        dnsZone,
        projectName,
      })),
    [tableQuery.data?.items, projectName]
  );

  return (
    <DnsZoneList
      data={rows}
      loading={tableQuery.isLoading}
      linkBuilder={(row) =>
        projectRoutes.dns.detail(
          projectName,
          row.dnsZone.metadata?.namespace ?? '',
          row.dnsZone.metadata?.name ?? ''
        )
      }
    />
  );
}
