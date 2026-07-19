import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { getEmailCondition } from '@/features/email/email-utils';
import { ListTable, ListColumnHeader } from '@/features/milo';
import { routes } from '@/utils/config/routes.config';
import { startCase } from '@/utils/helpers';
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
  /** `page` (default): rich filter sidebar, page inset. `tab`: inline filters + tab inset, for embedding in a detail tab. */
  variant?: 'page' | 'tab';
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

export default function EmailList({
  queryKeyPrefix,
  fetchFn,
  searchPlaceholder,
  variant = 'page',
}: EmailListProps) {
  const queryKey = useMemo(() => listQueryKey(queryKeyPrefix), [queryKeyPrefix]);
  const tableQuery = useQuery({
    queryKey,
    queryFn: fetchFn,
  });

  const data = useMemo(() => rowsForTable(tableQuery.data?.items ?? []), [tableQuery.data?.items]);

  const columns = [
    columnHelper.accessor('status.emailAddress', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Recipient`} />,
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
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
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
      header: ({ column }) => <ListColumnHeader column={column} title={t`Subject`} />,
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
      header: ({ column }) => <ListColumnHeader column={column} title={t`Sent`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <ListTable
      loading={tableQuery.isLoading}
      data={data}
      columns={columns}
      pageSize={20}
      getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      searchPlaceholder={searchPlaceholder ?? t`Search email activity...`}
      emptyMessage={t`No email activity found.`}
      inset={variant === 'tab' ? 'tab' : 'page'}
      filterLayout={variant === 'tab' ? 'inline' : 'sidebar'}
      filters={[
        {
          column: 'spec.priority',
          label: t`Priority`,
          options: [
            { value: 'normal', label: t`Normal` },
            { value: 'high', label: t`High` },
            { value: 'low', label: t`Low` },
          ],
        },
        {
          column: 'deliveryStatus',
          label: t`Status`,
          options: [
            { value: 'True', label: t`Delivered` },
            { value: 'False', label: t`Failed` },
            { value: 'Unknown', label: t`Pending` },
          ],
        },
      ]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [row.status?.emailAddress, row.spec?.recipient?.emailAddress, row.status?.subject]
          .map((v) => (v ?? '').toLowerCase())
          .some((v) => v.includes(q));
      }}
    />
  );
}
