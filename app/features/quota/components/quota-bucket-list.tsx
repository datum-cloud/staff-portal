import { DateFormatter } from '@/components/date';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/datum-ui/data-table';
import { Text } from '@/modules/datum-ui/typography';
import { AllowanceBucket, AllowanceBucketListResponse } from '@/resources/schemas';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';

interface QuotaBucketListProps {
  queryKeyPrefix: string[];
  fetchFn: (params: any) => Promise<AllowanceBucketListResponse>;
}

const columnHelper = createColumnHelper<AllowanceBucket>();

const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor('spec.resourceType', {
    header: () => <Trans>Resource Type</Trans>,
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor('status', {
    id: 'grants',
    header: () => <Trans>Grants</Trans>,
    cell: ({ getValue }) => {
      const status = getValue();
      if (!status?.contributingGrantRefs?.length) {
        return <Text textColor="muted">-</Text>;
      }

      return (
        <div className="flex flex-col gap-1">
          {status.contributingGrantRefs.map((grant, index) => (
            <div key={index} className="flex items-center gap-2">
              <Text weight="medium">{grant.name}</Text>
              <Text textColor="muted">({grant.amount})</Text>
            </div>
          ))}
        </div>
      );
    },
  }),
  columnHelper.accessor('status', {
    id: 'usage',
    header: () => <Trans>Usage</Trans>,
    cell: ({ getValue }) => {
      const status = getValue();
      if (!status) {
        return <Text textColor="muted">-</Text>;
      }

      const { allocated = 0, available = 0, limit = 0 } = status;
      const used = allocated;
      const total = limit;
      const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Text size="sm" weight="medium">
              {used} / {total}
            </Text>
            <Text size="xs" textColor="muted">
              ({percentage}%)
            </Text>
          </div>
          <div className="bg-muted h-2 w-full rounded-full">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => {
      return <DateFormatter date={getValue()} withTime />;
    },
  }),
];

export function QuotaBucketList({ queryKeyPrefix, fetchFn }: QuotaBucketListProps) {
  const tableState = useDataTableQuery<AllowanceBucketListResponse>({
    queryKeyPrefix,
    fetchFn,
    useSorting: true,
  });

  return (
    <DataTableProvider<AllowanceBucket, AllowanceBucketListResponse>
      columns={columns}
      transform={(resp) => ({
        rows: resp?.data?.items || [],
        cursor: resp?.data?.metadata?.continue,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable<AllowanceBucket> />
      </div>
    </DataTableProvider>
  );
}
