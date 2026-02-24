import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeCondition, BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { contactGroupDeleteMutation, contactGroupListQuery } from '@/resources/request/client';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-ui/button';
import {
  ClientDataTable,
  ClientDataTableProvider,
  ClientDataTableSearch,
  createAdvancedSearch,
  useClientDataTableQuery,
} from '@datum-ui/client-data-table';
import { ActionItem } from '@datum-ui/data-table';
import { useTaskQueue } from '@datum-ui/task-queue';
import { toast } from '@datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisNotificationV1Alpha1ContactGroup,
  ComMiloapisNotificationV1Alpha1ContactGroupList,
} from '@openapi/notification.miloapis.com/v1alpha1';
import { useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Contact Groups`);
};

const columnHelper = createColumnHelper<ComMiloapisNotificationV1Alpha1ContactGroup>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const contactGroupName = row.original.metadata?.name ?? '';

      return (
        <DisplayName
          displayName={row.original.spec?.displayName ?? ''}
          name={contactGroupName}
          to={`./${contactGroupName}`}
        />
      );
    },
  }),
  columnHelper.accessor('spec.visibility', {
    header: () => <Trans>Visibility</Trans>,
    cell: ({ getValue }) => {
      return <BadgeState state={getValue() ?? 'public'} />;
    },
  }),
  columnHelper.accessor('status', {
    header: () => <Trans>Status</Trans>,
    cell: ({ getValue }) => (
      <BadgeCondition status={getValue()} multiple={false} showMessage className="text-xs" />
    ),
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    id: 'metadata.creationTimestamp',
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => <DateTime date={getValue()} />,
  }),
];

export default function Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueue, showSummary } = useTaskQueue();
  const [selectedContactGroup, setSelectedContactGroup] =
    useState<ComMiloapisNotificationV1Alpha1ContactGroup | null>(null);
  const [bulkDeleteRows, setBulkDeleteRows] = useState<
    ComMiloapisNotificationV1Alpha1ContactGroup[] | null
  >(null);

  const tableState = useClientDataTableQuery<ComMiloapisNotificationV1Alpha1ContactGroupList>({
    defaultSort: ['metadata.creationTimestamp:desc'],
    useSorting: true,
    useSearch: true,
    queryKeyPrefix: 'contact-groups',
    fetchFn: () => contactGroupListQuery(),
  });

  const { selectedRowsForBulk, selectedCount } = useMemo(() => {
    const data = tableState.query.data?.items ?? [];
    const selectedIds = Object.keys(tableState.rowSelection ?? {}).filter(
      (id) => tableState.rowSelection![id]
    );
    const rows = data.filter((row) => selectedIds.includes(row.metadata?.name ?? ''));
    return { selectedRowsForBulk: rows, selectedCount: rows.length };
  }, [tableState.query.data, tableState.rowSelection]);

  const actions: ActionItem<ComMiloapisNotificationV1Alpha1ContactGroup>[] = [
    {
      label: 'Edit',
      icon: EditIcon,
      onClick: (row) => navigate(contactGroupRoutes.detail(row.metadata?.name ?? '')),
    },
    {
      label: 'Delete',
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedContactGroup(row),
    },
  ];

  return (
    <>
      <AppActionBar>
        <Button
          type="primary"
          icon={<PlusCircleIcon size={16} />}
          onClick={() => navigate(contactGroupRoutes.create())}>
          <Trans>Add</Trans>
        </Button>
      </AppActionBar>

      <DialogConfirm
        open={!!selectedContactGroup}
        onOpenChange={() => setSelectedContactGroup(null)}
        title={t`Delete Contact`}
        description={t`Are you sure you want to delete contact "${selectedContactGroup?.spec?.displayName ?? ''}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await contactGroupDeleteMutation(selectedContactGroup?.metadata);
          await new Promise((resolve) =>
            setTimeout(() => resolve(tableState.query.refetch()), 1000)
          );
          setSelectedContactGroup(null);
          toast.success(t`Contact Group deleted successfully`);
        }}
      />

      <DialogConfirm
        open={bulkDeleteRows !== null && bulkDeleteRows.length > 0}
        onOpenChange={(open) => !open && setBulkDeleteRows(null)}
        title={t`Delete contact groups`}
        description={
          bulkDeleteRows?.length === 1
            ? t`Are you sure you want to delete "${bulkDeleteRows[0]?.spec?.displayName ?? bulkDeleteRows[0]?.metadata?.name ?? ''}"? This action cannot be undone.`
            : t`Are you sure you want to delete ${bulkDeleteRows?.length ?? 0} contact groups? This action cannot be undone.`
        }
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={() => {
          const rows = bulkDeleteRows ?? [];
          setBulkDeleteRows(null);
          tableState.setRowSelection({});
          const taskTitle =
            rows.length === 1 ? t`Delete contact group` : t`Delete ${rows.length} contact groups`;
          enqueue({
            title: taskTitle,
            icon: <Trash2Icon className="size-4" />,
            items: rows,
            itemConcurrency: 3,
            getItemId: (row) => row.metadata?.name ?? '',
            processItem: async (row) => {
              await contactGroupDeleteMutation(row.metadata);
            },
            onComplete: () => {
              queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
              tableState.setRowSelection({});
            },
            completionActions: (_result, { failed, items: summaryItems }) => [
              ...(failed > 0
                ? [
                    {
                      children: t`Summary`,
                      type: 'tertiary' as const,
                      theme: 'outline' as const,
                      size: 'small' as const,
                      onClick: () =>
                        showSummary(
                          taskTitle,
                          summaryItems.map((item) => ({
                            id: item.id,
                            label: item.id,
                            status:
                              item.status === 'succeeded'
                                ? ('success' as const)
                                : ('failed' as const),
                            message: item.message,
                          }))
                        ),
                    },
                  ]
                : []),
              {
                children: t`View contact groups`,
                type: 'primary' as const,
                theme: 'outline' as const,
                size: 'small' as const,
                onClick: () => navigate(contactGroupRoutes.list()),
              },
            ],
          });
        }}
      />

      <ClientDataTableProvider<
        ComMiloapisNotificationV1Alpha1ContactGroup,
        ComMiloapisNotificationV1Alpha1ContactGroupList
      >
        {...tableState}
        selectable
        getRowId={(row) => row.metadata?.name ?? ''}
        actions={actions}
        columns={columns}
        transform={(data) => data.items || []}
        globalFilterFn={createAdvancedSearch<ComMiloapisNotificationV1Alpha1ContactGroup>([
          (row) => row.metadata?.name?.toLowerCase() || '',
          (row) => row.spec?.displayName?.toLowerCase() || '',
          (row) => row.spec?.visibility?.toLowerCase() || '',
        ])}>
        <div className="m-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ClientDataTableSearch placeholder={t`Search contact groups...`} />
            {selectedCount > 0 && (
              <Button
                type="danger"
                theme="outline"
                icon={<Trash2Icon size={16} />}
                onClick={() => setBulkDeleteRows(selectedRowsForBulk)}>
                <Trans>Delete {selectedCount} selected</Trans>
              </Button>
            )}
          </div>
          <ClientDataTable />
        </div>
      </ClientDataTableProvider>
    </>
  );
}
