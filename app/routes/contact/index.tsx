import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { contactDeleteMutation, contactListQuery } from '@/resources/request/client';
import { contactRoutes } from '@/utils/config/routes.config';
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
import { toast } from '@datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  type ComMiloapisNotificationV1Alpha1Contact,
  type ComMiloapisNotificationV1Alpha1ContactList,
} from '@openapi/notification.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Contacts`);
};

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
  // columnHelper.accessor('spec.subject.name', {
  //   id: 'subject',
  //   header: () => <Trans>Subject</Trans>,
  //   cell: ({ row }) => `${row.original.spec.subject.kind}/${row.original.spec.subject.name}`,
  // }),
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
  const [selectedContact, setSelectedContact] =
    useState<ComMiloapisNotificationV1Alpha1Contact | null>(null);
  const tableState = useClientDataTableQuery<ComMiloapisNotificationV1Alpha1ContactList>({
    defaultSort: ['metadata.creationTimestamp:desc'],
    useSorting: true,
    useSearch: true,
    queryKeyPrefix: 'contacts',
    fetchFn: () => contactListQuery(),
  });

  const actions: ActionItem<ComMiloapisNotificationV1Alpha1Contact>[] = [
    {
      label: 'Edit',
      icon: EditIcon,
      onClick: (row) => {
        navigate(contactRoutes.detail(row.metadata?.namespace ?? '', row.metadata?.name ?? ''));
      },
    },
    {
      label: 'Delete',
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedContact(row),
    },
  ];

  return (
    <>
      <AppActionBar>
        <Button
          type="primary"
          icon={<PlusCircleIcon size={16} />}
          onClick={() => navigate(contactRoutes.create())}>
          <Trans>Add</Trans>
        </Button>
      </AppActionBar>

      <DialogConfirm
        open={!!selectedContact}
        onOpenChange={() => setSelectedContact(null)}
        title={t`Delete Contact`}
        description={t`Are you sure you want to delete contact "${selectedContact?.metadata?.name ?? ''}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await contactDeleteMutation(selectedContact?.metadata);
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
        transform={(data) => data.items || []}
        globalFilterFn={createAdvancedSearch<ComMiloapisNotificationV1Alpha1Contact>([
          (row) => row.metadata?.name?.toLowerCase() || '',
          (row) => row.spec?.givenName?.toLowerCase() || '',
          (row) => row.spec?.familyName?.toLowerCase() || '',
          (row) => row.spec?.email?.toLowerCase() || '',
          (row) =>
            `${row.spec?.givenName || ''} ${row.spec?.familyName || ''}`.trim().toLowerCase(),
        ])}>
        <div className="m-4 flex flex-col gap-2">
          <ClientDataTableSearch placeholder={t`Search contacts...`} />
          <ClientDataTable />
        </div>
      </ClientDataTableProvider>
    </>
  );
}
