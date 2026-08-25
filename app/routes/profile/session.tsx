import type { Route } from './+types/session';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { ListColumnHeader, ListTable } from '@/features/milo';
import { useApp } from '@/providers/app.provider';
import { useDeleteSessionMutation, useSessionListQuery } from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { t } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { ComMiloapisGoMiloPkgApisIdentityV1Alpha1Session } from '@openapi/identity.miloapis.com/v1alpha1';
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
      icon: <ACTION_ICONS.delete className="size-4" />,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedSession(row),
    },
  ];

  const columns = [
    columnHelper.accessor('metadata.name', {
      id: 'metadata.name',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Session ID`} />,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <Text>{value}</Text> : <Text className="text-muted-foreground">—</Text>;
      },
    }),
    columnHelper.accessor('status.ip', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`IP`} />,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <Text>{value}</Text> : <Text className="text-muted-foreground">—</Text>;
      },
    }),
    columnHelper.accessor('status.fingerprintID', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Fingerprint ID`} />,
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <Text>{value}</Text> : <Text className="text-muted-foreground">—</Text>;
      },
    }),
    columnHelper.accessor('status.createdAt', {
      id: 'status.createdAt',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => {
        if (!getValue()) return <Text className="text-muted-foreground">—</Text>;
        return <DateTime date={getValue()} />;
      },
    }),
    columnHelper.accessor('status.expiresAt', {
      id: 'status.expiresAt',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Expires`} />,
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

      <ListTable
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={50}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'status.createdAt', desc: true }]}
        searchPlaceholder={t`Search sessions...`}
        emptyMessage={t`No active sessions.`}
        inset="tab"
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return [row.metadata?.name, row.status?.ip, row.status?.fingerprintID]
            .map((v) => (v ?? '').toLowerCase())
            .some((v) => v.includes(q));
        }}
      />
    </>
  );
}
