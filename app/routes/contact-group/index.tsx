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
import { toast } from '@datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisNotificationV1Alpha1ContactGroup,
  ComMiloapisNotificationV1Alpha1ContactGroupList,
} from '@openapi/notification.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
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
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => <DateTime date={getValue()} />,
  }),
];

export default function Page() {
  const navigate = useNavigate();
  const [selectedContactGroup, setSelectedContactGroup] =
    useState<ComMiloapisNotificationV1Alpha1ContactGroup | null>(null);
  const tableState = useClientDataTableQuery<ComMiloapisNotificationV1Alpha1ContactGroupList>({
    useSorting: true,
    useSearch: true,
    queryKeyPrefix: 'contact-groups',
    fetchFn: () => contactGroupListQuery(),
  });

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

      <ClientDataTableProvider<
        ComMiloapisNotificationV1Alpha1ContactGroup,
        ComMiloapisNotificationV1Alpha1ContactGroupList
      >
        {...tableState}
        actions={actions}
        columns={columns}
        transform={(data) => data.items || []}
        globalFilterFn={createAdvancedSearch<ComMiloapisNotificationV1Alpha1ContactGroup>([
          (row) => row.metadata?.name?.toLowerCase() || '',
          (row) => row.spec?.displayName?.toLowerCase() || '',
          (row) => row.spec?.visibility?.toLowerCase() || '',
        ])}>
        <div className="m-4 flex flex-col gap-2">
          <ClientDataTableSearch placeholder={t`Search contact groups...`} />
          <ClientDataTable />
        </div>
      </ClientDataTableProvider>
    </>
  );
}
