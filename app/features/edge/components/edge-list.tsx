import { BadgeState } from '@/components/badge';
import { Chip } from '@/components/chip';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import { SearchResourceTable, type ControlledSearch } from '@/components/search-resource-table';
import { ListColumnHeader } from '@/features/milo';
import { projectRoutes } from '@/utils/config/routes.config';
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

/** Human-readable name from annotations; falls back to resource name. */
function edgeDisplayName(edge: ComDatumapisNetworkingV1AlphaHttpProxy): string {
  const annotations = edge.metadata?.annotations ?? {};
  return (
    annotations['app.kubernetes.io/name']?.trim() ||
    annotations['kubernetes.io/display-name']?.trim() ||
    edge.metadata?.name ||
    ''
  );
}

/** Spec + status hostnames, de-duplicated, for display and search. */
function edgeHostnames(edge: ComDatumapisNetworkingV1AlphaHttpProxy): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const hostname of [...(edge.spec?.hostnames ?? []), ...(edge.status?.hostnames ?? [])]) {
    const value = hostname?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function edgeStatus(edge: ComDatumapisNetworkingV1AlphaHttpProxy): {
  state: string;
  tooltip?: string;
} {
  const condition = edge.status?.conditions?.[0];
  if (!condition) return { state: 'pending' };
  return {
    state: condition.status === 'True' ? 'active' : 'pending',
    tooltip: condition.message || undefined,
  };
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
    columnHelper.accessor((row) => edgeDisplayName(row.edge), {
      id: 'displayName',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Display Name`} />,
      cell: ({ getValue, row }) => {
        const to = linkBuilder(row.original);
        const label = getValue();
        return to ? <Link to={to}>{label}</Link> : <span>{label}</span>;
      },
    }),
    columnHelper.accessor((row) => row.edge.metadata?.name ?? '', {
      id: 'id',
      header: ({ column }) => <ListColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => <DisplayId value={getValue()} />,
    }),
    ...(showProjectColumn
      ? [
          columnHelper.accessor((row) => row.projectName, {
            id: 'project',
            header: ({ column }) => <ListColumnHeader column={column} title={t`Project`} />,
            cell: ({ getValue }) => {
              const project = getValue();
              return project ? <Link to={projectRoutes.detail(project)}>{project}</Link> : '—';
            },
          }),
        ]
      : []),
    columnHelper.accessor((row) => edgeHostnames(row.edge), {
      id: 'hostnames',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Hostnames`} />,
      enableSorting: false,
      cell: ({ getValue }) => {
        const list = getValue();
        if (list.length === 0) return <span className="text-muted-foreground">——</span>;
        return <Chip items={list} maxVisible={2} variant="outline" size="sm" />;
      },
    }),
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
      cell: ({ row }) => {
        const { state, tooltip } = edgeStatus(row.original.edge);
        return <BadgeState state={state} tooltip={tooltip} />;
      },
    }),
    columnHelper.accessor((row) => row.edge.metadata?.creationTimestamp, {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
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
      hasMoreMessage={t`The list of Application Load Balancer resources is limited to 2,000 results at a time. Refine your search to surface other resources.`}
      searchPlaceholder={searchPlaceholder ?? t`Search Application Load Balancer...`}
      emptyMessage={emptyMessage ?? t`No Application Load Balancer found.`}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const name = (row.edge.metadata?.name ?? '').toLowerCase();
        const displayName = edgeDisplayName(row.edge).toLowerCase();
        const project = row.projectName.toLowerCase();
        const endpointText = endpoints(row.edge).join(' ').toLowerCase();
        const hostnameText = edgeHostnames(row.edge).join(' ').toLowerCase();
        return (
          name.includes(q) ||
          displayName.includes(q) ||
          project.includes(q) ||
          endpointText.includes(q) ||
          hostnameText.includes(q)
        );
      }}
    />
  );
}
