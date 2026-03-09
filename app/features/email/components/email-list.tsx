import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { getEmailCondition } from '@/features/email/email-utils';
import { routes } from '@/utils/config/routes.config';
import { startCase } from '@/utils/helpers';
import {
  ClientDataTable,
  ClientDataTableFacetFilter,
  ClientDataTableProvider,
  ClientDataTableSearch,
  createAdvancedSearch,
  useClientDataTableQuery,
} from '@datum-ui/client-data-table';
import { DataTableActiveFilters } from '@datum-ui/data-table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisNotificationV1Alpha1Email,
  ComMiloapisNotificationV1Alpha1EmailList,
} from '@openapi/notification.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

interface EmailListProps {
  queryKeyPrefix: string | string[];
  fetchFn: () => Promise<ComMiloapisNotificationV1Alpha1EmailList>;
  searchPlaceholder?: string;
}

const columnHelper = createColumnHelper<ComMiloapisNotificationV1Alpha1Email>();

export default function EmailList({ queryKeyPrefix, fetchFn, searchPlaceholder }: EmailListProps) {
  const tableState = useClientDataTableQuery<ComMiloapisNotificationV1Alpha1EmailList>({
    queryKeyPrefix,
    fetchFn,
    defaultSort: ['metadata.creationTimestamp:desc'],
    useSorting: true,
    useFilters: true,
    useSearch: true,
  });

  const columns = [
    columnHelper.accessor('status.emailAddress', {
      header: () => <Trans>Recipient</Trans>,
      cell: ({ row, getValue }) => {
        return (
          <Link
            to={routes.emailActivityDetail(
              row.original.metadata?.namespace ?? '',
              row.original.metadata?.name ?? ''
            )}>
            {getValue()}
          </Link>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: () => <Trans>Status</Trans>,
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
      header: () => <Trans>Subject</Trans>,
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
      header: () => <Trans>Sent</Trans>,
      cell: ({ getValue }) => {
        return <DateTime date={getValue()} />;
      },
    }),
  ];

  return (
    <ClientDataTableProvider<
      ComMiloapisNotificationV1Alpha1Email,
      ComMiloapisNotificationV1Alpha1EmailList
    >
      columns={columns}
      transform={(data) => data?.items || []}
      filterFn={(row, filters) => {
        // Filter by priority
        if (filters.priority) {
          if (row.spec?.priority !== filters.priority) {
            return false;
          }
        }

        // Filter by status (from conditions)
        if (filters.status) {
          const condition = getEmailCondition(row);
          if (condition?.status !== filters.status) {
            return false;
          }
        }

        return true;
      }}
      globalFilterFn={createAdvancedSearch<ComMiloapisNotificationV1Alpha1Email>([
        (row) =>
          row.status?.emailAddress?.toLowerCase() ||
          row.spec?.recipient?.emailAddress?.toLowerCase() ||
          '',
      ])}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <ClientDataTableSearch placeholder={searchPlaceholder || t`Search email activity...`} />
          <ClientDataTableFacetFilter
            filterKey="priority"
            label={t`Priority`}
            placeholder={t`Filter by priority`}
            options={[
              { value: 'normal', label: t`Normal` },
              { value: 'high', label: t`High` },
              { value: 'low', label: t`Low` },
            ]}
          />
          <ClientDataTableFacetFilter
            filterKey="status"
            label={t`Status`}
            placeholder={t`Filter by status`}
            options={[
              { value: 'True', label: t`Delivered` },
              { value: 'False', label: t`Failed` },
              { value: 'Unknown', label: t`Pending` },
            ]}
          />
        </div>

        <DataTableActiveFilters
          filters={tableState.filters}
          search={tableState.search}
          onClearFilter={tableState.clearFilter}
          onClearAllFilters={tableState.clearAllFilters}
          onClearSearch={tableState.clearSearch}
          filterLabels={{
            priority: t`Priority`,
            status: t`Status`,
          }}
          formatFilterValue={(key, value) => {
            if (key === 'priority') {
              const labels: Record<string, string> = {
                normal: t`Normal`,
                high: t`High`,
                low: t`Low`,
              };
              return (
                labels[value] || String(value).charAt(0).toUpperCase() + String(value).slice(1)
              );
            }
            if (key === 'status') {
              const labels: Record<string, string> = {
                True: t`Delivered`,
                False: t`Failed`,
                Unknown: t`Pending`,
              };
              return labels[value] || String(value);
            }
            return String(value);
          }}
          excludeFilters={['search']}
        />

        <ClientDataTable<ComMiloapisNotificationV1Alpha1Email> />
      </div>
    </ClientDataTableProvider>
  );
}
