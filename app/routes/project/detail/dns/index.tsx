import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import { BadgeProgrammingError } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DnsHostChips } from '@/features/dns';
import { useProjectDnsListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject, transformControlPlaneStatus } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { Loader2Icon } from 'lucide-react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`DNS - ${projectName}`);
};

const columnHelper = createColumnHelper<ComMiloapisNetworkingDnsV1Alpha1DnsZone>();

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project.metadata?.name ?? '';
  const tableQuery = useProjectDnsListQuery(projectName);

  const columns = [
    columnHelper.accessor('spec.domainName', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Zone Name`} />,
      cell: ({ row }) => {
        const status = transformControlPlaneStatus(row.original.status, {
          includeConditionDetails: true,
        });
        return (
          <div className="flex items-center gap-2">
            <Link
              to={projectRoutes.dns.detail(
                projectName,
                row.original.metadata?.namespace ?? '',
                row.original.metadata?.name ?? ''
              )}>
              <span className="font-medium">{row.original.spec.domainName}</span>
            </Link>
            <BadgeProgrammingError
              isProgrammed={status.isProgrammed}
              programmedReason={status.programmedReason}
              statusMessage={status.message}
              errorReasons={null}
            />
          </div>
        );
      },
    }),
    columnHelper.accessor('status.domainRef.status.nameservers', {
      header: () => t`DNS Host`,
      cell: ({ getValue }) => {
        if (!getValue()) {
          return <Loader2Icon className="text-muted-foreground size-4 animate-spin" />;
        }
        return <DnsHostChips data={getValue() ?? []} maxVisible={2} />;
      },
    }),
    columnHelper.accessor('status.recordCount', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Records`} />,
      cell: ({ getValue }) => getValue() ?? '-',
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
    columnHelper.accessor((row) => row.metadata?.annotations?.['kubernetes.io/description'], {
      id: 'description',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Description`} />,
      cell: ({ getValue }) => getValue() ?? '-',
    }),
  ];

  return (
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={tableQuery.data?.items ?? []}
      columns={columns}
      pageSize={20}
      getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const dnsHosts = (row.status?.domainRef?.status?.nameservers ?? [])
          .flatMap((ns: { hostname?: string; ips?: Array<{ registrantName?: string }> }) => [
            ns.hostname,
            ...(ns.ips?.map((ip) => ip.registrantName) ?? []),
          ])
          .join(' ')
          .toLowerCase();
        return (
          [row.spec?.domainName, row.metadata?.annotations?.['kubernetes.io/description']]
            .map((v) => (v ?? '').toLowerCase())
            .some((v) => v.includes(q)) || dnsHosts.includes(q)
        );
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              <DataTable.Search placeholder={t`Search DNS zones...`} className="w-full md:w-64" />
            }
          />
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No DNS zones found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
