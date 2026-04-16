import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DomainDnsProviders, DomainExpiration, DomainStatusProbe } from '@/features/domain';
import { useProjectDomainListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { ComDatumapisNetworkingV1AlphaDomain } from '@openapi/networking.datumapis.com/v1alpha';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Domain - ${projectName}`);
};

const columnHelper = createColumnHelper<ComDatumapisNetworkingV1AlphaDomain>();

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project.metadata?.name ?? '';
  const tableQuery = useProjectDomainListQuery(projectName);

  const columns = [
    columnHelper.accessor('spec.domainName', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Domain`} />,
      cell: ({ getValue, row }) => (
        <Link
          to={projectRoutes.domain.detail(
            projectName,
            row.original.metadata?.namespace ?? '',
            row.original.metadata?.name ?? ''
          )}>
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('status.registration.registrar.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Registrar`} />,
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.accessor('status.nameservers', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`DNS Providers`} />,
      cell: ({ getValue }) => <DomainDnsProviders nameservers={getValue() ?? []} maxVisible={2} />,
    }),
    columnHelper.accessor('status.registration.expiresAt', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Expiration Date`} />,
      cell: ({ getValue }) => <DomainExpiration expiresAt={getValue()} />,
    }),
    columnHelper.accessor('status', {
      header: () => t`Status`,
      cell: ({ row }) => (
        <DomainStatusProbe
          projectName={projectName}
          domainName={row.original.metadata?.name ?? ''}
          namespace={row.original.metadata?.namespace ?? ''}
        />
      ),
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
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
        const domain = (row.spec?.domainName ?? '').toLowerCase();
        const registrar = (row.status?.registration?.registrar?.name ?? '').toLowerCase();
        return domain.includes(q) || registrar.includes(q);
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              <DataTable.Search placeholder={t`Search domains...`} className="w-full md:w-64" />
            }
          />
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No domains found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
