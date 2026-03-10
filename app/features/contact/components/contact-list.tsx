import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { contactDeleteMutation } from '@/resources/request/client';
import { contactRoutes } from '@/utils/config/routes.config';
import { toast } from '@datum-cloud/datum-ui/toast';
import {
  ClientDataTable,
  ClientDataTableProvider,
  ClientDataTableSearch,
  createAdvancedSearch,
  useClientDataTableQuery,
} from '@datum-ui/client-data-table';
import { ActionItem } from '@datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  type ComMiloapisNotificationV1Alpha1Contact,
  type ComMiloapisNotificationV1Alpha1ContactList,
} from '@openapi/notification.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

const columnHelper = createColumnHelper<ComMiloapisNotificationV1Alpha1Contact>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
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
    header: () => <Trans>Email</Trans>,
    cell: ({ getValue }) => getValue(),
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

const globalFilterFn = createAdvancedSearch<ComMiloapisNotificationV1Alpha1Contact>([
  (row) => row.metadata?.name?.toLowerCase() || '',
  (row) => row.spec?.givenName?.toLowerCase() || '',
  (row) => row.spec?.familyName?.toLowerCase() || '',
  (row) => row.spec?.email?.toLowerCase() || '',
  (row) => `${row.spec?.givenName || ''} ${row.spec?.familyName || ''}`.trim().toLowerCase(),
]);

export interface ContactListProps {
  queryKeyPrefix: string | string[];
  fetchFn: () => Promise<ComMiloapisNotificationV1Alpha1ContactList>;
  searchPlaceholder?: string;
}

export function ContactList({
  queryKeyPrefix,
  fetchFn,
  searchPlaceholder = undefined,
}: ContactListProps) {
  const navigate = useNavigate();
  const [selectedContact, setSelectedContact] =
    useState<ComMiloapisNotificationV1Alpha1Contact | null>(null);

  const tableState = useClientDataTableQuery<ComMiloapisNotificationV1Alpha1ContactList>({
    queryKeyPrefix,
    fetchFn,
    defaultSort: ['metadata.creationTimestamp:desc'],
    useSorting: true,
    useSearch: true,
  });

  const actions: ActionItem<ComMiloapisNotificationV1Alpha1Contact>[] = [
    {
      label: 'Edit',
      icon: EditIcon,
      onClick: (row: ComMiloapisNotificationV1Alpha1Contact) => {
        navigate(contactRoutes.detail(row.metadata?.namespace ?? '', row.metadata?.name ?? ''));
      },
    },
    {
      label: 'Delete',
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row: ComMiloapisNotificationV1Alpha1Contact) => setSelectedContact(row),
    },
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
          await new Promise((resolve) =>
            setTimeout(() => resolve(tableState.query.refetch()), 1000)
          );
          setSelectedContact(null);
          toast.success(t`Contact deleted successfully`);
        }}
      />

      <ClientDataTableProvider<
        ComMiloapisNotificationV1Alpha1Contact,
        ComMiloapisNotificationV1Alpha1ContactList
      >
        {...tableState}
        actions={actions}
        columns={columns}
        transform={(data) => data?.items || []}
        globalFilterFn={globalFilterFn}>
        <div className="m-4 flex flex-col gap-2">
          <ClientDataTableSearch
            placeholder={searchPlaceholder ?? (t`Search contacts...` as string)}
          />
          <ClientDataTable />
        </div>
      </ClientDataTableProvider>
    </>
  );
}
