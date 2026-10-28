import type { Route } from './+types/session';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { useApp } from '@/providers/app.provider';
import { useDeleteSessionMutation, useSessionListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { ComMiloapisGoMiloPkgApisIdentityV1Alpha1Session } from '@openapi/identity.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';

export const handle = {
  breadcrumb: () => <Trans>Active Sessions</Trans>,
};

export const meta: Route.MetaFunction = () => {
  return metaObject('Active Sessions');
};

const columnHelper = createColumnHelper<ComMiloapisGoMiloPkgApisIdentityV1Alpha1Session>();

export default function Page() {
  const { t: tMacro } = useLingui();
  const { user } = useApp();
  const userId = user?.metadata?.name ?? '';
  const tableQuery = useSessionListQuery(userId);
  const deleteSessionMutation = useDeleteSessionMutation();

  const [selectedSession, setSelectedSession] =
    useState<ComMiloapisGoMiloPkgApisIdentityV1Alpha1Session | null>(null);

  const actions: ActionItem<ComMiloapisGoMiloPkgApisIdentityV1Alpha1Session>[] = [
    {
      label: tMacro`Delete`,
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedSession(row),
    },
  ];

  const columns = [
    columnHelper.accessor('metadata.name', {
      id: 'metadata.name',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Session ID`} />,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <Text>{value}</Text> : <Text className="text-muted-foreground">—</Text>;
      },
    }),
    columnHelper.accessor('status.ip', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`IP`} />,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <Text>{value}</Text> : <Text className="text-muted-foreground">—</Text>;
      },
    }),
    columnHelper.accessor('status.fingerprintID', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Fingerprint ID`} />,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <Text>{value}</Text> : <Text className="text-muted-foreground">—</Text>;
      },
    }),
    columnHelper.accessor('status.createdAt', {
      id: 'status.createdAt',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => {
        if (!getValue()) return <Text className="text-muted-foreground">—</Text>;
        return <DateTime date={getValue()} />;
      },
    }),
    columnHelper.accessor('status.expiresAt', {
      id: 'status.expiresAt',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Expires`} />,
      cell: ({ getValue }) => {
        if (!getValue()) return <Text className="text-muted-foreground">—</Text>;
        return <DateTime date={getValue() ?? ''} />;
      },
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

  return (
    <>
      <DialogConfirm
        open={!!selectedSession}
        onOpenChange={() => setSelectedSession(null)}
        title={tMacro`Delete Session`}
        description={tMacro`Are you sure you want to delete session "${selectedSession?.metadata?.name ?? ''}"? This action cannot be undone.`}
        confirmText={tMacro`Delete`}
        cancelText={tMacro`Cancel`}
        variant="destructive"
        requireConfirmation
        onConfirm={async () => {
          await deleteSessionMutation.mutateAsync({
            userId,
            sessionName: selectedSession?.metadata?.name ?? '',
          });
          setSelectedSession(null);
          toast.success(tMacro`Session deleted successfully`);
        }}
      />

      <DataTable.Client
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={20}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'status.createdAt', desc: true }]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return [row.metadata?.name, row.status?.ip, row.status?.fingerprintID]
            .map((v) => (v ?? '').toLowerCase())
            .some((v) => v.includes(q));
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search placeholder={t`Search sessions...`} className="w-full md:w-64" />
              }
            />
            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No active sessions.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
