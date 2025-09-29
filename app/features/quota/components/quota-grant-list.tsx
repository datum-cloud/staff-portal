import { BadgeCondition } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/datum-ui/data-table';
import { ResourceGrant, ResourceGrantListResponse } from '@/resources/schemas';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';

interface QuotaGrantListProps {
  queryKeyPrefix: string[];
  fetchFn: (params: any) => Promise<ResourceGrantListResponse>;
}

const columnHelper = createColumnHelper<ResourceGrant>();

function computeAllocationByResourceType(
  allowances: ResourceGrant['spec']['allowances'] | undefined
) {
  const allocationByResourceType = new Map<string, number>();
  const list = allowances || [];
  for (const allowance of list) {
    const sumForAllowance = (allowance.buckets || []).reduce((acc, b) => acc + (b?.amount || 0), 0);
    const prev = allocationByResourceType.get(allowance.resourceType) || 0;
    allocationByResourceType.set(allowance.resourceType, prev + sumForAllowance);
  }
  return Array.from(allocationByResourceType.entries());
}

const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor((row) => row.spec.allowances, {
    id: 'resourceTypes',
    header: () => <Trans>Resource Type</Trans>,
    cell: ({ getValue }) => {
      const entries = computeAllocationByResourceType(getValue());
      return (
        <div className="flex flex-col gap-1">
          {entries.map(([type]) => (
            <div key={type}>{type}</div>
          ))}
        </div>
      );
    },
  }),
  columnHelper.accessor((row) => row.spec.allowances, {
    id: 'allocations',
    header: () => <Trans>Allocation</Trans>,
    cell: ({ getValue }) => {
      const entries = computeAllocationByResourceType(getValue());
      return (
        <div className="flex flex-col gap-1">
          {entries.map(([type, total]) => (
            <div key={type}>{total}</div>
          ))}
        </div>
      );
    },
  }),
  columnHelper.accessor('status', {
    header: () => <Trans>Status</Trans>,
    cell: ({ getValue }) => (
      <BadgeCondition status={getValue()} multiple={false} showMessage className="text-xs" />
    ),
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => {
      return <DateFormatter date={getValue()} withTime />;
    },
  }),
];

export function QuotaGrantList({ queryKeyPrefix, fetchFn }: QuotaGrantListProps) {
  const tableState = useDataTableQuery<ResourceGrantListResponse>({
    queryKeyPrefix,
    fetchFn,
    useSorting: true,
  });

  return (
    <DataTableProvider<ResourceGrant, ResourceGrantListResponse>
      columns={columns}
      transform={(resp) => ({
        rows: resp?.data?.items || [],
        cursor: resp?.data?.metadata?.continue,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable<ResourceGrant> />
      </div>
    </DataTableProvider>
  );
}
