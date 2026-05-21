import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { SearchResourceTable, type ControlledSearch } from '@/components/search-resource-table';
import { projectRoutes } from '@/utils/config/routes.config';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { ComDatumapisNetworkingV1AlphaHttpProxy } from '@openapi/networking.datumapis.com/v1alpha';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export interface EdgeRow {
  edge: ComDatumapisNetworkingV1AlphaHttpProxy;
  projectName: string;
}

export interface EdgeListProps {
  data: EdgeRow[];
  loading: boolean;
  /**
   * Returns the detail URL for a row, or `null` to render the name as
   * non-clickable text. Used by the global view to skip rows that lack a
   * resolvable project context.
   */
  linkBuilder: (row: EdgeRow) => string | null;
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

const columnHelper = createColumnHelper<EdgeRow>();

/** Flatten backend endpoints across all rules, for display and filtering. */
function endpoints(edge: ComDatumapisNetworkingV1AlphaHttpProxy): string[] {
  return (edge.spec?.rules ?? []).flatMap(
    (rule) => rule.backends?.map((b) => b.endpoint ?? '').filter(Boolean) ?? []
  );
}

export function EdgeList({
  data,
  loading,
  linkBuilder,
  showProjectColumn = false,
  emptyMessage,
  searchPlaceholder,
  controlledSearch,
  hasMore = false,
}: EdgeListProps) {
  const columns = [
    columnHelper.accessor((row) => row.edge.metadata?.name ?? '', {
      id: 'name',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
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
    columnHelper.accessor((row) => endpoints(row.edge), {
      id: 'endpoint',
      header: () => t`Endpoint`,
      cell: ({ getValue }) => {
        const list = getValue();
        if (list.length === 0) return '—';
        return (
          <div className="flex flex-col gap-2">
            {list.map((endpoint, index) => (
              <div key={index}>{endpoint}</div>
            ))}
          </div>
        );
      },
    }),
    columnHelper.accessor((row) => row.edge.status, {
      id: 'status',
      header: () => t`Status`,
      cell: ({ getValue }) => (
        <BadgeCondition status={getValue()} multiple={false} showMessage className="text-xs" />
      ),
    }),
    columnHelper.accessor((row) => row.edge.metadata?.creationTimestamp, {
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
      getRowId={(row) => `${row.edge.metadata?.namespace ?? ''}/${row.edge.metadata?.name ?? ''}`}
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      controlledSearch={controlledSearch}
      hasMore={hasMore}
      hasMoreMessage={t`The list of AI Edge resources is limited to 100 results at a time. Refine your search to surface other resources.`}
      searchPlaceholder={searchPlaceholder ?? t`Search AI Edge...`}
      emptyMessage={emptyMessage ?? t`No AI Edge found.`}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const name = (row.edge.metadata?.name ?? '').toLowerCase();
        const project = row.projectName.toLowerCase();
        const endpointText = endpoints(row.edge).join(' ').toLowerCase();
        return name.includes(q) || project.includes(q) || endpointText.includes(q);
      }}
    />
  );
}
