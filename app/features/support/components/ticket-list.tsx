import { PriorityBadge } from './priority-badge';
import { TicketStatusBadge } from './ticket-status-badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { useApp } from '@/providers/app.provider';
import type { TicketListParams } from '@/resources/request/client/apis/support.api';
import { useTicketListQuery } from '@/resources/request/client/queries/support.queries';
import { supportRoutes } from '@/utils/config/routes.config';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import type { ComMiloApisSupportV1Alpha1SupportTicket } from '@openapi/support.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

const columnHelper = createColumnHelper<ComMiloApisSupportV1Alpha1SupportTicket>();

function isTicketUnread(
  ticket: ComMiloApisSupportV1Alpha1SupportTicket,
  principalId: string | undefined
): { unread: boolean; isNew: boolean } {
  const readState = ticket.status?.readState ?? {};
  const anyoneRead = Object.keys(readState).length > 0;
  const lastActivity = ticket.status?.lastActivity ?? ticket.metadata?.creationTimestamp;

  if (!anyoneRead) {
    return { unread: true, isNew: true };
  }

  if (!principalId || !lastActivity) {
    return { unread: false, isNew: false };
  }

  const lastRead = readState[principalId];
  if (!lastRead) {
    return { unread: true, isNew: false };
  }

  return {
    unread: new Date(lastActivity) > new Date(lastRead),
    isNew: false,
  };
}

export function TicketList({ params }: { params?: TicketListParams }) {
  const query = useTicketListQuery(params);
  const tickets = query.data?.items ?? [];
  const { principalId } = useApp();

  const columns = [
    columnHelper.accessor('spec.title', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Ticket`} />,
      cell: ({ getValue, row }) => {
        const ticket = row.original;
        const { unread, isNew } = isTicketUnread(ticket, principalId);
        return (
          <div className="flex min-w-0 items-center gap-2">
            {unread && (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-blue-500"
                title={isNew ? t`New — no staff has read this yet` : t`Unread — new activity`}
              />
            )}
            <div className="min-w-0">
              <Link
                to={supportRoutes.detail(ticket.metadata?.name ?? '')}
                className={`block hover:underline ${unread ? 'font-semibold' : 'text-muted-foreground font-normal'}`}>
                {getValue()}
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  to={supportRoutes.detail(ticket.metadata?.name ?? '')}
                  className="font-mono text-xs text-blue-600 hover:underline">
                  {ticket.metadata?.name}
                </Link>
                {isNew && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                    {t`New`}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('spec.status', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Status`} />,
      cell: ({ getValue }) => <TicketStatusBadge status={getValue()} />,
    }),
    columnHelper.accessor('spec.priority', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Priority`} />,
      cell: ({ getValue }) => <PriorityBadge priority={getValue()} />,
    }),
    columnHelper.accessor('spec.reporterRef.email', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Reporter`} />,
      cell: ({ getValue, row }) => (
        <span title={getValue()}>{row.original.spec.reporterRef.displayName || getValue()}</span>
      ),
    }),
    columnHelper.accessor('spec.ownerRef.displayName', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Owner`} />,
      cell: ({ getValue, row }) =>
        getValue() ||
        row.original.spec.ownerRef?.name || (
          <span className="text-muted-foreground">{t`Unassigned`}</span>
        ),
    }),
    columnHelper.accessor('spec.organizationRef.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Organization`} />,
      cell: ({ getValue }) => getValue() ?? '—',
    }),
    columnHelper.accessor('status.messageCount', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Messages`} />,
      cell: ({ getValue }) => getValue() ?? 0,
    }),
    columnHelper.accessor('status.lastActivity', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Last Activity`} />,
      cell: ({ getValue, row }) => (
        <DateTime date={getValue() ?? row.original.metadata?.creationTimestamp} />
      ),
      sortingFn: (a, b) => {
        const ta = a.original.status?.lastActivity ?? a.original.metadata?.creationTimestamp ?? '';
        const tb = b.original.status?.lastActivity ?? b.original.metadata?.creationTimestamp ?? '';
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      },
    }),
  ];

  return (
    <DataTable.Client
      loading={query.isLoading}
      data={tickets}
      columns={columns}
      pageSize={25}
      getRowId={(row) => row.metadata?.name ?? ''}
      defaultSort={[{ id: 'status.lastActivity', desc: true }]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          (row.metadata?.name ?? '').toLowerCase().includes(q) ||
          (row.spec.title ?? '').toLowerCase().includes(q) ||
          (row.spec.reporterRef.email ?? '').toLowerCase().includes(q) ||
          (row.spec.organizationRef?.name ?? '').toLowerCase().includes(q)
        );
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              <DataTable.Search placeholder={t`Search tickets...`} className="w-full md:w-80" />
            }
          />
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No support tickets found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
