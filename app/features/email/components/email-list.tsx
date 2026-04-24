import { BadgeState } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { getEmailCondition } from '@/features/email/email-utils';
import { routes } from '@/utils/config/routes.config';
import { startCase } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import {
  ComMiloapisNotificationV1Alpha1Email,
  ComMiloapisNotificationV1Alpha1EmailList,
} from '@openapi/notification.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';

interface EmailListProps {
  queryKeyPrefix: string | string[];
  fetchFn: () => Promise<ComMiloapisNotificationV1Alpha1EmailList>;
  searchPlaceholder?: string;
}

function listQueryKey(prefix: string | string[]) {
  return Array.isArray(prefix) ? [...prefix, 'list'] : [prefix, 'list'];
}

function rowsForTable(items: ComMiloapisNotificationV1Alpha1Email[]) {
  return items.map((row) => ({
    ...row,
    priority: row.spec?.priority,
    deliveryStatus: getEmailCondition(row)?.status,
  }));
}

const columnHelper = createColumnHelper<
  ComMiloapisNotificationV1Alpha1Email & {
    priority?: string;
    deliveryStatus?: string;
  }
>();

export default function EmailList({ queryKeyPrefix, fetchFn, searchPlaceholder }: EmailListProps) {
  const queryKey = useMemo(() => listQueryKey(queryKeyPrefix), [queryKeyPrefix]);
  const tableQuery = useQuery({
    queryKey,
    queryFn: fetchFn,
  });

  const data = useMemo(() => rowsForTable(tableQuery.data?.items ?? []), [tableQuery.data?.items]);

  const columns = [
    columnHelper.accessor('status.emailAddress', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Recipient`} />,
      cell: ({ row, getValue }) => (
        <Link
          to={routes.emailActivityDetail(
            row.original.metadata?.namespace ?? '',
            row.original.metadata?.name ?? ''
          )}>
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('status', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Status`} />,
      cell: ({ row }) => {
        const condition = getEmailCondition(row.original);
        return (
          <BadgeState
            state={condition?.status?.toLowerCase() ?? ''}
            message={startCase(condition?.reason ?? '')}
          />
        );
      },
    }),
    columnHelper.accessor('status.subject', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Subject`} />,
      cell: ({ getValue }) => {
        const subject = getValue();
        return subject ? (
          <Text size="sm" className="max-w-xs truncate" title={subject}>
            {subject}
          </Text>
        ) : (
          <Text textColor="muted">-</Text>
        );
      },
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Sent`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={data}
      columns={columns}
      pageSize={20}
      getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      filterFns={{
        'spec.priority': (cellValue, filterValue) =>
          String(cellValue ?? '').toLowerCase() === String(filterValue ?? '').toLowerCase(),
        deliveryStatus: (cellValue, filterValue) =>
          String(cellValue ?? '') === String(filterValue ?? ''),
      }}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [row.status?.emailAddress, row.spec?.recipient?.emailAddress, row.status?.subject]
          .map((v) => (v ?? '').toLowerCase())
          .some((v) => v.includes(q));
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              <DataTable.Search
                placeholder={searchPlaceholder ?? t`Search email activity...`}
                className="w-full md:w-64"
              />
            }
            filters={
              <>
                <DataTable.SelectFilter
                  column="spec.priority"
                  label={t`Priority`}
                  placeholder={t`Filter by priority`}
                  options={[
                    { value: 'normal', label: t`Normal` },
                    { value: 'high', label: t`High` },
                    { value: 'low', label: t`Low` },
                  ]}
                />
                <DataTable.SelectFilter
                  column="deliveryStatus"
                  label={t`Status`}
                  placeholder={t`Filter by status`}
                  options={[
                    { value: 'True', label: t`Delivered` },
                    { value: 'False', label: t`Failed` },
                    { value: 'Unknown', label: t`Pending` },
                  ]}
                />
              </>
            }
          />

          <DataTable.ActiveFilters
            excludeFilters={['search']}
            filterLabels={{
              'spec.priority': t`Priority`,
              deliveryStatus: t`Status`,
            }}
            formatFilterValue={{
              'spec.priority': (value: string) => {
                const labels: Record<string, string> = {
                  normal: t`Normal`,
                  high: t`High`,
                  low: t`Low`,
                };
                return (
                  labels[value] || String(value).charAt(0).toUpperCase() + String(value).slice(1)
                );
              },
              deliveryStatus: (value: string) => {
                const labels: Record<string, string> = {
                  True: t`Delivered`,
                  False: t`Failed`,
                  Unknown: t`Pending`,
                };
                return labels[value] ?? String(value);
              },
            }}
          />

          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No email activity found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
