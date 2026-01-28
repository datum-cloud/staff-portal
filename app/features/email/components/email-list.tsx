import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { EmailDetailDialog } from '@/features/email/components/email-detail-dialog';
import { extractTemplateName, getEmailStatus } from '@/features/email/email-utils';
import {
  ClientDataTable,
  ClientDataTableFacetFilter,
  ClientDataTableProvider,
  ClientDataTableSearch,
  createAdvancedSearch,
  useClientDataTableQuery,
} from '@datum-ui/client-data-table';
import { DataTableActiveFilters } from '@datum-ui/data-table';
import type { ActionItem } from '@datum-ui/data-table';
import { Text } from '@datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisNotificationV1Alpha1Email,
  ComMiloapisNotificationV1Alpha1EmailList,
} from '@openapi/notification.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { useState } from 'react';

interface EmailListProps {
  queryKeyPrefix: string | string[];
  fetchFn: () => Promise<ComMiloapisNotificationV1Alpha1EmailList>;
  searchPlaceholder?: string;
}

const columnHelper = createColumnHelper<ComMiloapisNotificationV1Alpha1Email>();

const createColumns = () => [
  columnHelper.accessor('spec.templateRef.name', {
    header: () => <Trans>Template</Trans>,
    cell: ({ getValue }) => {
      const templateName = extractTemplateName(getValue());
      return (
        <div className="flex flex-col">
          <Text className="font-medium">{templateName}</Text>
          {getValue() && getValue() !== templateName && (
            <Text size="sm" textColor="muted" className="max-w-xs truncate">
              {getValue()}
            </Text>
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor('spec.recipient.emailAddress', {
    header: () => <Trans>Recipient</Trans>,
    cell: ({ row, getValue }) => {
      const email = row.original.status?.emailAddress || getValue();
      return email ? <Text size="sm">{email}</Text> : <Text textColor="muted">-</Text>;
    },
  }),
  columnHelper.accessor('status', {
    header: () => <Trans>Status</Trans>,
    cell: ({ row }) => {
      const status = row.original.status;
      const conditionStatus = getEmailStatus(row.original);

      const statusLabel: Record<string, string> = {
        True: t`Delivered`,
        False: t`Failed`,
        Unknown: t`Pending`,
      };

      const customLabel = conditionStatus ? statusLabel[conditionStatus] : undefined;

      return (
        <BadgeCondition
          status={status}
          multiple={false}
          showMessage
          className="text-xs"
          customLabel={customLabel}
        />
      );
    },
  }),
  columnHelper.accessor('spec.priority', {
    header: () => <Trans>Priority</Trans>,
    cell: ({ getValue }) => {
      const priority = getValue();
      return priority ? (
        <Text className="capitalize">{priority}</Text>
      ) : (
        <Text textColor="muted">-</Text>
      );
    },
  }),
  columnHelper.display({
    id: 'providerId',
    header: () => <Trans>Provider ID</Trans>,
    cell: ({ row }) => {
      const providerId = row.original.status?.providerID;
      return providerId ? (
        <Text size="sm" textColor="muted">
          {providerId}
        </Text>
      ) : (
        <Text textColor="muted">-</Text>
      );
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => {
      return <DateTime date={getValue()} />;
    },
  }),
];

export default function EmailList({ queryKeyPrefix, fetchFn, searchPlaceholder }: EmailListProps) {
  const tableState = useClientDataTableQuery<ComMiloapisNotificationV1Alpha1EmailList>({
    queryKeyPrefix,
    fetchFn,
    useSorting: true,
    useFilters: true,
    useSearch: true,
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<ComMiloapisNotificationV1Alpha1Email | null>(
    null
  );

  const handleShowDetails = (email: ComMiloapisNotificationV1Alpha1Email) => {
    setSelectedEmail(email);
    setDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
  };

  const actions: ActionItem<ComMiloapisNotificationV1Alpha1Email>[] = [
    {
      label: t`Details`,
      onClick: (row: ComMiloapisNotificationV1Alpha1Email) => handleShowDetails(row),
    },
  ];

  return (
    <ClientDataTableProvider<
      ComMiloapisNotificationV1Alpha1Email,
      ComMiloapisNotificationV1Alpha1EmailList
    >
      columns={createColumns()}
      actions={actions}
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
          const emailStatus = getEmailStatus(row);
          if (emailStatus !== filters.status) {
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
        (row) => row.spec?.templateRef?.name?.toLowerCase() || '',
        (row) => extractTemplateName(row.spec?.templateRef?.name).toLowerCase(),
        (row) => row.metadata?.name?.toLowerCase() || '',
        (row) => row.status?.providerID?.toLowerCase() || '',
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

      <EmailDetailDialog
        open={detailsOpen}
        email={selectedEmail}
        onOpenChange={handleDetailsOpenChange}
      />
    </ClientDataTableProvider>
  );
}
