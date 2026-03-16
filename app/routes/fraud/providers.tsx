import type { Route } from './+types/providers';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { useFraudProviderListQuery } from '@/resources/request/client';
import type { FraudProvider } from '@/resources/types/fraud.types';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { createColumnHelper } from '@tanstack/react-table';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Fraud Providers`);
};

const columnHelper = createColumnHelper<FraudProvider>();

export default function Page() {
  const tableQuery = useFraudProviderListQuery();

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    }),
    columnHelper.accessor('spec.type', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Type`} />,
      cell: ({ getValue }) => <BadgeState state="info" message={getValue() ?? 'unknown'} />,
    }),
    columnHelper.accessor('spec.failurePolicy', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Failure Policy`} />,
      cell: ({ getValue }) => {
        const policy = getValue() ?? 'FailOpen';
        return <BadgeState state={policy === 'FailClosed' ? 'warning' : 'info'} message={policy} />;
      },
    }),
    columnHelper.accessor('spec.config.endpoint', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Endpoint`} />,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground max-w-xs truncate text-sm">
          {getValue() ?? 'default'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Status`} />,
      cell: ({ row }) => {
        const conditions = row.original.status?.conditions ?? [];
        const available = conditions.find((c) => c.type === 'Available');
        if (!available) return <BadgeState state="unknown" />;
        return (
          <BadgeState
            state={available.status === 'True' ? 'active' : 'error'}
            message={
              available.status === 'True' ? 'Available' : (available.reason ?? 'Unavailable')
            }
          />
        );
      },
    }),
    columnHelper.accessor('status.lastSuccessfulCall', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Last Success`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
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
      getRowId={(row) => row.metadata?.name ?? ''}
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No fraud providers configured.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
