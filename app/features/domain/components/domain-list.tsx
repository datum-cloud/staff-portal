import { DomainDnsProviders } from './domain-dns-provider';
import { DomainExpiration } from './domain-expiration';
import { DomainStatusProbe } from './domain-status-probe';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { ComDatumapisNetworkingV1AlphaDomain } from '@openapi/networking.datumapis.com/v1alpha';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export interface DomainRow {
  domain: ComDatumapisNetworkingV1AlphaDomain;
  projectName: string;
}

export interface DomainListProps {
  data: DomainRow[];
  loading: boolean;
  linkBuilder: (row: DomainRow) => string;
  showProjectColumn?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
}

const columnHelper = createColumnHelper<DomainRow>();

export function DomainList({
  data,
  loading,
  linkBuilder,
  showProjectColumn = false,
  emptyMessage,
  searchPlaceholder,
}: DomainListProps) {
  const columns = [
    columnHelper.accessor((row) => row.domain.spec?.domainName ?? '', {
      id: 'domain',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Domain`} />,
      cell: ({ getValue, row }) => <Link to={linkBuilder(row.original)}>{getValue()}</Link>,
    }),
    ...(showProjectColumn
      ? [
          columnHelper.accessor((row) => row.projectName, {
            id: 'project',
            header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Project`} />,
            cell: ({ getValue }) => getValue() || '—',
          }),
        ]
      : []),
    columnHelper.accessor((row) => row.domain.status?.registration?.registrar?.name ?? '', {
      id: 'registrar',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Registrar`} />,
      cell: ({ getValue }) => getValue() || '—',
    }),
    columnHelper.accessor((row) => row.domain.status?.nameservers, {
      id: 'nameservers',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`DNS Providers`} />,
      cell: ({ getValue }) => <DomainDnsProviders nameservers={getValue() ?? []} maxVisible={2} />,
    }),
    columnHelper.accessor((row) => row.domain.status?.registration?.expiresAt, {
      id: 'expiration',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Expiration Date`} />,
      cell: ({ getValue }) => <DomainExpiration expiresAt={getValue()} />,
    }),
    columnHelper.display({
      id: 'status',
      header: () => t`Status`,
      cell: ({ row }) => (
        <DomainStatusProbe
          projectName={row.original.projectName}
          domainName={row.original.domain.metadata?.name ?? ''}
          namespace={row.original.domain.metadata?.namespace ?? ''}
        />
      ),
    }),
    columnHelper.accessor((row) => row.domain.metadata?.creationTimestamp, {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <DataTable.Client
      loading={loading}
      data={data}
      columns={columns}
      pageSize={20}
      getRowId={(row) =>
        `${row.domain.metadata?.namespace ?? ''}/${row.domain.metadata?.name ?? ''}`
      }
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const domain = (row.domain.spec?.domainName ?? '').toLowerCase();
        const registrar = (row.domain.status?.registration?.registrar?.name ?? '').toLowerCase();
        const project = row.projectName.toLowerCase();
        return domain.includes(q) || registrar.includes(q) || project.includes(q);
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              <DataTable.Search
                placeholder={searchPlaceholder ?? t`Search domains...`}
                className="w-full md:w-64"
              />
            }
          />
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={emptyMessage ?? t`No domains found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
