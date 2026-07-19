import { DnsHostChips } from './dns-host-chips';
import { BadgeProgrammingError } from '@/components/badge';
import { DateTime } from '@/components/date';
import { SearchResourceTable, type ControlledSearch } from '@/components/search-resource-table';
import { ListColumnHeader } from '@/features/milo';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { projectRoutes } from '@/utils/config/routes.config';
import { transformControlPlaneStatus } from '@/utils/helpers';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export interface DnsZoneRow {
  dnsZone: ComMiloapisNetworkingDnsV1Alpha1DnsZone;
  projectName: string;
}

export interface DnsZoneListProps {
  data: DnsZoneRow[];
  loading: boolean;
  /**
   * Returns the detail URL for a row, or `null` to render the zone name as
   * non-clickable text. Used by the global view to skip rows that lack a
   * resolvable project context.
   */
  linkBuilder: (row: DnsZoneRow) => string | null;
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

const columnHelper = createColumnHelper<DnsZoneRow>();

/** DNS host registrant names extracted from a zone, for the client-side filter. */
function dnsHostText(zone: ComMiloapisNetworkingDnsV1Alpha1DnsZone): string {
  return (zone.status?.domainRef?.status?.nameservers ?? [])
    .flatMap((ns) => [ns.hostname, ...(ns.ips?.map((ip) => ip.registrantName) ?? [])])
    .join(' ')
    .toLowerCase();
}

export function DnsZoneList({
  data,
  loading,
  linkBuilder,
  showProjectColumn = false,
  emptyMessage,
  searchPlaceholder,
  controlledSearch,
  hasMore = false,
}: DnsZoneListProps) {
  const columns = [
    columnHelper.accessor((row) => row.dnsZone.spec?.domainName ?? '', {
      id: 'domain',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Zone Name`} />,
      cell: ({ getValue, row }) => {
        const to = linkBuilder(row.original);
        const status = transformControlPlaneStatus(row.original.dnsZone.status, {
          includeConditionDetails: true,
        });
        return (
          <div className="flex items-center gap-2">
            {to ? (
              <Link to={to} className="font-medium">
                {getValue()}
              </Link>
            ) : (
              <span className="font-medium">{getValue()}</span>
            )}
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
    columnHelper.accessor((row) => row.dnsZone.status?.domainRef?.status?.nameservers, {
      id: 'nameservers',
      enableSorting: false,
      header: ({ column }) => <ListColumnHeader column={column} title={t`DNS Host`} />,
      cell: ({ getValue, row }) => {
        const nameservers = getValue();
        // A zone with a `status` but no resolved nameservers yet is still
        // settling — show a spinner. Search-index rows carry no `status`, so
        // there is nothing to wait for: fall through to the empty state.
        if (!nameservers) {
          return row.original.dnsZone.status ? (
            <STATUS_ICONS.loading className="text-muted-foreground size-4 animate-spin" />
          ) : (
            <DnsHostChips data={[]} maxVisible={2} />
          );
        }
        return <DnsHostChips data={nameservers} maxVisible={2} />;
      },
    }),
    columnHelper.accessor((row) => row.dnsZone.status?.recordCount, {
      id: 'recordCount',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Records`} />,
      cell: ({ getValue }) => getValue() ?? '—',
    }),
    columnHelper.accessor((row) => row.dnsZone.metadata?.creationTimestamp, {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
    columnHelper.accessor(
      (row) => row.dnsZone.metadata?.annotations?.['kubernetes.io/description'],
      {
        id: 'description',
        header: ({ column }) => <ListColumnHeader column={column} title={t`Description`} />,
        cell: ({ getValue }) => getValue() ?? '—',
      }
    ),
  ];

  return (
    <SearchResourceTable
      data={data}
      loading={loading}
      columns={columns}
      getRowId={(row) =>
        `${row.dnsZone.metadata?.namespace ?? ''}/${row.dnsZone.metadata?.name ?? ''}`
      }
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      controlledSearch={controlledSearch}
      hasMore={hasMore}
      hasMoreMessage={t`The list of DNS zones is limited to 2,000 results at a time. Refine your search to surface other zones.`}
      searchPlaceholder={searchPlaceholder ?? t`Search DNS zones...`}
      emptyMessage={emptyMessage ?? t`No DNS zones found.`}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const domain = (row.dnsZone.spec?.domainName ?? '').toLowerCase();
        const description = (
          row.dnsZone.metadata?.annotations?.['kubernetes.io/description'] ?? ''
        ).toLowerCase();
        const project = row.projectName.toLowerCase();
        return (
          domain.includes(q) ||
          description.includes(q) ||
          project.includes(q) ||
          dnsHostText(row.dnsZone).includes(q)
        );
      }}
    />
  );
}
