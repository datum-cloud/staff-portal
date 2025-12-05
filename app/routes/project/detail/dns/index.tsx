import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import { BadgeProgrammingError } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DnsHostChips } from '@/features/dns';
import { projectDnsListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject, transformControlPlaneStatus } from '@/utils/helpers';
import { DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisNetworkingDnsV1Alpha1DnsZone,
  ComMiloapisNetworkingDnsV1Alpha1DnsZoneList,
} from '@openapi/dns.networking.miloapis.com/v1alpha1';
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

  const tableState = useDataTableQuery<ComMiloapisNetworkingDnsV1Alpha1DnsZoneList>({
    queryKeyPrefix: ['projects', project.metadata.name, 'dns'],
    fetchFn: (params) => projectDnsListQuery(project.metadata.name, params),
    useSorting: true,
  });

  const columns = [
    columnHelper.accessor('spec.domainName', {
      header: () => <Trans>Zone Name</Trans>,
      cell: ({ row }) => {
        const status = transformControlPlaneStatus(row.original.status, {
          includeConditionDetails: true,
        });
        return (
          <div className="flex items-center gap-2">
            <Link
              to={projectRoutes.dns.detail(
                project.metadata.name,
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
      header: () => <Trans>DNS Host</Trans>,
      cell: ({ getValue }) => {
        if (!getValue()) {
          return <Loader2Icon className="text-muted-foreground size-4 animate-spin" />;
        }

        return <DnsHostChips data={getValue() ?? []} maxVisible={2} />;
      },
    }),
    columnHelper.accessor('status.recordCount', {
      header: () => <Trans>Records</Trans>,
      cell: ({ getValue }) => getValue() ?? '-',
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      header: () => <Trans>Created</Trans>,
      cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
    }),
    columnHelper.accessor((row) => row.metadata?.annotations?.['kubernetes.io/description'], {
      id: 'description',
      header: () => <Trans>Description</Trans>,
      cell: ({ getValue }) => getValue() ?? '-',
    }),
  ];

  return (
    <DataTableProvider<
      ComMiloapisNetworkingDnsV1Alpha1DnsZone,
      ComMiloapisNetworkingDnsV1Alpha1DnsZoneList
    >
      columns={columns}
      transform={(data) => ({
        rows: data?.items || [],
        cursor: data?.metadata?.continue,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable />
      </div>
    </DataTableProvider>
  );
}
