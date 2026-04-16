import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeCondition, BadgeState } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import {
  contactGroupDeleteMutation,
  contactGroupQueryKeys,
  useContactGroupListQuery,
  useDeleteContactGroupMutation,
} from '@/resources/request/client';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { useTaskQueue } from '@datum-cloud/datum-ui/task-queue';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisNotificationV1Alpha1ContactGroup } from '@openapi/notification.miloapis.com/v1alpha1';
import { useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, PlusCircleIcon, Trash2Icon } from 'lucide-react';
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
      icon: EditIcon,
      onClick: (row) => navigate(contactGroupRoutes.detail(row.metadata?.name ?? '')),
    },
    {
      label: t`Delete`,
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedContactGroup(row),
    },
  ];

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
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
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Visibility`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'public'} />,
    }),
    columnHelper.accessor('status', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Status`} />,
      cell: ({ getValue }) => (
        <BadgeCondition status={getValue()} multiple={false} showMessage className="text-xs" />
      ),
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right" />,
      cell: ({ row }) => (
        <div className="flex w-full justify-end">
          <DataTable.RowActions row={row} actions={actions} />
        </div>
      ),
    }),
  ];

  const rows = tableQuery.data?.items ?? [];

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
          await deleteContactGroupMutation.mutateAsync(selectedContactGroup?.metadata);
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
          const taskRows = bulkDeleteRows ?? [];
          setBulkDeleteRows(null);
          const taskTitle =
            taskRows.length === 1
              ? t`Delete contact group`
              : t`Delete ${taskRows.length} contact groups`;
          enqueue({
            title: taskTitle,
            icon: <Trash2Icon className="size-4" />,
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

      <DataTable.Client
        loading={tableQuery.isLoading}
        data={rows}
        columns={columns}
        pageSize={20}
        getRowId={(row) => row.metadata?.name ?? ''}
        enableRowSelection
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return [row.metadata?.name, row.spec?.displayName, row.spec?.visibility]
            .map((s) => (s ?? '').toLowerCase())
            .some((s) => s.includes(q));
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search
                  placeholder={t`Search contact groups...`}
                  className="w-full md:w-64"
                />
              }
              extras={
                <DataTable.BulkActions>
                  {(selectedRows) =>
                    selectedRows.length > 0 ? (
                      <Button
                        type="danger"
                        theme="outline"
                        icon={<Trash2Icon size={16} />}
                        onClick={() =>
                          setBulkDeleteRows(
                            selectedRows as ComMiloapisNotificationV1Alpha1ContactGroup[]
                          )
                        }>
                        <Trans>Delete {selectedRows.length} selected</Trans>
                      </Button>
                    ) : null
                  }
                </DataTable.BulkActions>
              }
            />
            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No contact groups found.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
