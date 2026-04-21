import { BadgeCondition } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { contactDeleteMutation } from '@/resources/request/client';
import { contactRoutes } from '@/utils/config/routes.config';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import {
  type ComMiloapisNotificationV1Alpha1Contact,
  type ComMiloapisNotificationV1Alpha1ContactList,
} from '@openapi/notification.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

const columnHelper = createColumnHelper<ComMiloapisNotificationV1Alpha1Contact>();

export interface ContactListProps {
  queryKeyPrefix: string | string[];
  fetchFn: () => Promise<ComMiloapisNotificationV1Alpha1ContactList>;
  searchPlaceholder?: string;
}

function listQueryKey(prefix: string | string[]) {
  return Array.isArray(prefix) ? [...prefix, 'list'] : [prefix, 'list'];
}

export function ContactList({
  queryKeyPrefix,
  fetchFn,
  searchPlaceholder = undefined,
}: ContactListProps) {
  const navigate = useNavigate();
  const [selectedContact, setSelectedContact] =
    useState<ComMiloapisNotificationV1Alpha1Contact | null>(null);

  const queryKey = useMemo(() => listQueryKey(queryKeyPrefix), [queryKeyPrefix]);
  const tableQuery = useQuery({
    queryKey,
    queryFn: fetchFn,
  });

  const actions: ActionItem<ComMiloapisNotificationV1Alpha1Contact>[] = [
    {
      label: t`Edit`,
      icon: EditIcon,
      onClick: (row) => {
        navigate(contactRoutes.detail(row.metadata?.namespace ?? '', row.metadata?.name ?? ''));
      },
    },
    {
      label: t`Delete`,
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedContact(row),
    },
  ];

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const contactName = row.original.metadata?.name ?? '';
        const displayName = [row.original.spec?.givenName, row.original.spec?.familyName]
          .filter(Boolean)
          .join(' ');

        return (
          <DisplayName
            displayName={displayName || contactName}
            name={contactName}
            to={contactRoutes.detail(row.original.metadata?.namespace ?? '', contactName)}
          />
        );
      },
    }),
    columnHelper.accessor('spec.email', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Email`} />,
      cell: ({ getValue }) => getValue(),
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

  return (
    <>
      <DialogConfirm
        open={!!selectedContact}
        onOpenChange={() => setSelectedContact(null)}
        title={t`Delete Contact`}
        description={t`Are you sure you want to delete contact "${selectedContact?.metadata?.name ?? ''}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          if (!selectedContact?.metadata) return;
          await contactDeleteMutation(selectedContact.metadata);
          await new Promise((resolve) => setTimeout(() => resolve(tableQuery.refetch()), 1000));
          setSelectedContact(null);
          toast.success(t`Contact deleted successfully`);
        }}
      />

      <DataTable.Client
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={20}
        getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          const name = (row.metadata?.name ?? '').toLowerCase();
          const given = (row.spec?.givenName ?? '').toLowerCase();
          const family = (row.spec?.familyName ?? '').toLowerCase();
          const email = (row.spec?.email ?? '').toLowerCase();
          const full = `${row.spec?.givenName || ''} ${row.spec?.familyName || ''}`
            .trim()
            .toLowerCase();
          return (
            name.includes(q) ||
            given.includes(q) ||
            family.includes(q) ||
            email.includes(q) ||
            full.includes(q)
          );
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search
                  placeholder={searchPlaceholder ?? t`Search contacts...`}
                  className="w-full md:w-64"
                />
              }
            />

            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No contacts found.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
