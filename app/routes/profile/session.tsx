import type { Route } from './+types/session';
import { DateFormatter } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/datum-ui/data-table';
import { toast } from '@/modules/datum-ui/toast';
import { Text } from '@/modules/datum-ui/typography';
import { useApp } from '@/providers/app.provider';
import { sessionDeleteMutation, sessionListQuery } from '@/resources/request/client';
import { IdentitySession, IdentitySessionListResponse } from '@/resources/schemas';
import { metaObject } from '@/utils/helpers';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';

export const handle = {
  breadcrumb: () => <Trans>Active Sessions</Trans>,
};

export const meta: Route.MetaFunction = () => {
  return metaObject('Active Sessions');
};

const columnHelper = createColumnHelper<IdentitySession>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Session ID</Trans>,
    cell: ({ getValue }) => {
      const value = getValue();
      return value ? <Text>{value}</Text> : <Text textColor="muted">—</Text>;
    },
  }),
  columnHelper.accessor('status.ip', {
    header: () => <Trans>IP</Trans>,
    cell: ({ getValue }) => {
      const value = getValue();
      return value ? <Text>{value}</Text> : <Text textColor="muted">—</Text>;
    },
  }),
  columnHelper.accessor('status.createdAt', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => {
      if (!getValue()) return <Text textColor="muted">—</Text>;
      return <DateFormatter date={getValue()} withTime />;
    },
  }),
  columnHelper.accessor('status.expiresAt', {
    header: () => <Trans>Expires</Trans>,
    cell: ({ getValue }) => {
      if (!getValue()) return <Text textColor="muted">—</Text>;
      return <DateFormatter date={getValue() ?? ''} withTime />;
    },
  }),
];

export default function Page() {
  const { t } = useLingui();
  const { user } = useApp();
  const [selectedSession, setSelectedSession] = useState<IdentitySession | null>(null);

  const tableState = useDataTableQuery<IdentitySessionListResponse>({
    queryKeyPrefix: 'sessions',
    fetchFn: (params) => sessionListQuery(user?.metadata.name ?? '', params),
    useSorting: true,
  });

  const actions = [
    {
      label: 'Delete',
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row: IdentitySession) => setSelectedSession(row),
    },
  ];

  return (
    <>
      <DialogConfirm
        open={!!selectedSession}
        onOpenChange={() => setSelectedSession(null)}
        title={t`Delete Session`}
        description={t`Are you sure you want to delete session "${selectedSession?.metadata.name}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        requireConfirmation
        onConfirm={async () => {
          try {
            await sessionDeleteMutation(
              user?.metadata.name ?? '',
              selectedSession?.metadata.name ?? ''
            );
            await new Promise((resolve) =>
              setTimeout(() => resolve(tableState.query.refetch()), 1000)
            );
            setSelectedSession(null);
            toast.success(t`Session deleted successfully`);
          } catch (error) {
            toast.error(t`Failed to delete session`);
          }
        }}
      />

      <DataTableProvider<IdentitySession, IdentitySessionListResponse>
        columns={columns}
        actions={actions}
        transform={(data) => ({
          rows: data?.data?.items || [],
          cursor: data?.data?.metadata?.continue,
        })}
        {...tableState}>
        <div className="m-4 flex flex-col gap-2">
          <DataTable<IdentitySession> />
        </div>
      </DataTableProvider>
    </>
  );
}
