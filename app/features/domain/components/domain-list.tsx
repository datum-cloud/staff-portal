import { DomainDnsProviders } from './domain-dns-provider';
import { DomainExpiration } from './domain-expiration';
import { DomainStatusProbe } from './domain-status-probe';
import { DateTime } from '@/components/date';
import { SearchResourceTable, type ControlledSearch } from '@/components/search-resource-table';
import { projectRoutes } from '@/utils/config/routes.config';
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
  /**
   * Returns the detail URL for a row, or `null` to render the domain name as
   * non-clickable text. Used by the global view to skip rows that lack a
   * resolvable project context.
   */
  linkBuilder: (row: DomainRow) => string | null;
  showProjectColumn?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  /**
   * If set, the search input is controlled externally and client-side
   * filtering is disabled — the caller is expected to refetch with the
   * given query (e.g. via the search API). Used by the global view where
   * the dataset can exceed the client's in-memory rows.
   */
  controlledSearch?: ControlledSearch;
  /**
   * When true, surfaces an info hint near the pagination indicating that
   * more results exist than what's currently loaded. Used with the search
   * API which caps responses at 100 rows.
   */
  hasMore?: boolean;
}

const columnHelper = createColumnHelper<DomainRow>();

export function DomainList({
  data,
  loading,
  linkBuilder,
  showProjectColumn = false,
  emptyMessage,
  searchPlaceholder,
  controlledSearch,
  hasMore = false,
}: DomainListProps) {
  const columns = [
    columnHelper.accessor((row) => row.domain.spec?.domainName ?? '', {
      id: 'domain',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Domain`} />,
      cell: ({ getValue, row }) => {
        const to = linkBuilder(row.original);
        return to ? <Link to={to}>{getValue()}</Link> : <span>{getValue()}</span>;
      },
    }),
    ...(showProjectColumn
      ? [
          columnHelper.accessor((row) => row.projectName, {
            id: 'project',
            header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Project`} />,
            cell: ({ getValue }) => {
              const project = getValue();
              return project ? <Link to={projectRoutes.detail(project)}>{project}</Link> : '—';
            },
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
    <SearchResourceTable
      data={data}
      loading={loading}
      columns={columns}
      getRowId={(row) =>
        `${row.domain.metadata?.namespace ?? ''}/${row.domain.metadata?.name ?? ''}`
      }
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      controlledSearch={controlledSearch}
      hasMore={hasMore}
      hasMoreMessage={t`The list of domains is limited to 100 results at a time. Refine your search to surface other domains.`}
      searchPlaceholder={searchPlaceholder ?? t`Search domains...`}
      emptyMessage={emptyMessage ?? t`No domains found.`}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const domain = (row.domain.spec?.domainName ?? '').toLowerCase();
        const registrar = (row.domain.status?.registration?.registrar?.name ?? '').toLowerCase();
        const project = row.projectName.toLowerCase();
        return domain.includes(q) || registrar.includes(q) || project.includes(q);
      }}
    />
  );
}
