import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { ListPage, ListTable, ListColumnHeader } from '@/features/milo';
import {
  contactGroupDeleteMutation,
  contactGroupQueryKeys,
  useContactGroupListQuery,
  useDeleteContactGroupMutation,
} from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { Button } from '@datum-cloud/datum-ui/button';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { useTaskQueue } from '@datum-cloud/datum-ui/task-queue';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisNotificationV1Alpha1ContactGroup } from '@openapi/notification.miloapis.com/v1alpha1';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Contact Groups`);
};

const columnHelper = createColumnHelper<ComMiloapisNotificationV1Alpha1ContactGroup>();

export default function Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueue, showSummary } = useTaskQueue();
  const [selectedContactGroup, setSelectedContactGroup] =
    useState<ComMiloapisNotificationV1Alpha1ContactGroup | null>(null);
  const [bulkDeleteRows, setBulkDeleteRows] = useState<
    ComMiloapisNotificationV1Alpha1ContactGroup[] | null
  >(null);

  const tableQuery = useContactGroupListQuery();
  const deleteContactGroupMutation = useDeleteContactGroupMutation();

  const actions: ActionItem<ComMiloapisNotificationV1Alpha1ContactGroup>[] = [
    {
      label: t`Edit`,
      icon: <ACTION_ICONS.edit className="size-4" />,
      onClick: (row) => navigate(contactGroupRoutes.detail(row.metadata?.name ?? '')),
    },
    {
      label: t`Delete`,
      icon: <ACTION_ICONS.delete className="size-4" />,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedContactGroup(row),
    },
  ];

  const columns = [
    columnHelper.accessor((row) => row.spec?.displayName ?? row.metadata?.name ?? '', {
      id: 'name',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ getValue, row }) => {
        const contactGroupName = row.original.metadata?.name ?? '';
        return <DisplayName displayName={getValue()} to={`./${contactGroupName}`} />;
      },
    }),
    columnHelper.accessor('spec.visibility', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Visibility`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'public'} />,
    }),
    columnHelper.accessor('status', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      // Shrink to the badge rather than taking a share of spare width.
      meta: { cellClassName: 'w-px whitespace-nowrap' },
      cell: ({ getValue }) => {
        // First condition True ⇒ active, with its message as the tooltip.
        const condition = getValue()?.conditions?.[0];
        return (
          <BadgeState
            state={condition?.status === 'True' ? 'active' : 'pending'}
            tooltip={condition?.message || undefined}
          />
        );
      },
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => null,
      // w-px shrinks the column to its button instead of a share of spare width.
      meta: { cellClassName: 'w-px px-2' },
      cell: ({ row }) => (
        <div className="flex w-full justify-center">
          <DataTable.RowActions row={row} actions={actions} />
        </div>
      ),
    }),
  ];

  return (
    <>
      <DialogConfirm
        open={!!selectedContactGroup}
        onOpenChange={() => setSelectedContactGroup(null)}
        title={t`Delete Contact Group`}
        description={t`Are you sure you want to delete contact group "${selectedContactGroup?.spec?.displayName ?? ''}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await deleteContactGroupMutation.mutateAsync(selectedContactGroup?.metadata);
          setSelectedContactGroup(null);
          toast.success(t`Contact group deleted successfully`);
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
          const taskRows = bulkDeleteRows ?? [];
          setBulkDeleteRows(null);
          const taskTitle =
            taskRows.length === 1
              ? t`Delete contact group`
              : t`Delete ${taskRows.length} contact groups`;
          enqueue({
            title: taskTitle,
            icon: <ACTION_ICONS.delete className="size-4" />,
            items: taskRows,
            itemConcurrency: 3,
            getItemId: (row) => row.metadata?.name ?? '',
            processItem: async (row) => {
              await contactGroupDeleteMutation(row.metadata);
            },
            onComplete: () => {
              queryClient.invalidateQueries({ queryKey: contactGroupQueryKeys.all });
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

      <ListPage>
        <ListTable
          loading={tableQuery.isLoading}
          data={tableQuery.data?.items ?? []}
          columns={columns}
          pageSize={50}
          layout="flush"
          enableRowSelection
          actions={
            <Button
              size="xs"
              theme="outline"
              icon={<ACTION_ICONS.add size={14} />}
              onClick={() => navigate(contactGroupRoutes.create())}>
              <Trans>Add</Trans>
            </Button>
          }
          bulkActions={(selectedRows) =>
            selectedRows.length > 0 ? (
              <Button
                type="danger"
                theme="outline"
                size="xs"
                icon={<ACTION_ICONS.delete size={14} />}
                onClick={() =>
                  setBulkDeleteRows(selectedRows as ComMiloapisNotificationV1Alpha1ContactGroup[])
                }>
                <Trans>Delete {selectedRows.length} selected</Trans>
              </Button>
            ) : null
          }
          getRowId={(row) => row.metadata?.name ?? ''}
          defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
          searchPlaceholder={t`Search contact groups...`}
          emptyMessage={t`No contact groups found.`}
          filterFields={[
            {
              id: 'name',
              label: t`Name`,
              type: 'text',
              accessor: (row) => row.spec?.displayName ?? row.metadata?.name ?? '',
            },
            {
              id: 'visibility',
              label: t`Visibility`,
              type: 'enum',
              // Unset reads as public, as the column shows it.
              accessor: (row) => row.spec?.visibility ?? 'public',
              options: [
                { value: 'public', label: <BadgeState state="public" /> },
                { value: 'private', label: <BadgeState state="private" /> },
              ],
            },
            {
              id: 'status',
              label: t`Status`,
              type: 'enum',
              // Same reading as the Status column: first condition True ⇒ Active.
              accessor: (row) =>
                row.status?.conditions?.[0]?.status === 'True' ? 'Active' : 'Pending',
              options: [
                { value: 'Active', label: <BadgeState state="active" /> },
                { value: 'Pending', label: <BadgeState state="pending" /> },
              ],
            },
            {
              id: 'created',
              label: t`Created`,
              type: 'date',
              accessor: 'metadata.creationTimestamp',
            },
          ]}
          searchFn={(row, search) => {
            const q = search.trim().toLowerCase();
            if (!q) return true;
            return [row.metadata?.name, row.spec?.displayName, row.spec?.visibility]
              .map((s) => (s ?? '').toLowerCase())
              .some((s) => s.includes(q));
          }}
        />
      </ListPage>
    </>
  );
}
