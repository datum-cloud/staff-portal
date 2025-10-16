import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeCondition, BadgeState } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DialogConfirm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { contactGroupDeleteMutation, contactGroupListQuery } from '@/resources/request/client';
import { ContactGroup, ContactGroupListResponse } from '@/resources/schemas';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-ui/button';
import { ActionItem, DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { toast } from '@datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { EditIcon, PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Contact Groups`);
};

const columnHelper = createColumnHelper<ContactGroup>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const contactGroupName = row.original.metadata.name;

      return (
        <DisplayName
          displayName={row.original.spec.displayName}
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
    cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
  }),
];

export default function Page() {
  const navigate = useNavigate();
  const [selectedContactGroup, setSelectedContactGroup] = useState<ContactGroup | null>(null);
  const tableState = useDataTableQuery<ContactGroupListResponse>({
    queryKeyPrefix: 'contact-groups',
    fetchFn: contactGroupListQuery,
    useSorting: true,
  });

  const actions: ActionItem<ContactGroup>[] = [
    {
      label: 'Edit',
      icon: EditIcon,
      onClick: (row) => navigate(contactGroupRoutes.edit(row.metadata.name)),
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
          <Trans>New</Trans>
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
          await contactGroupDeleteMutation(selectedContactGroup?.metadata?.name ?? '');
          await new Promise((resolve) =>
            setTimeout(() => resolve(tableState.query.refetch()), 1000)
          );
          setSelectedContactGroup(null);
          toast.success(t`Contact Group deleted successfully`);
        }}
      />

      <DataTableProvider<ContactGroup, ContactGroupListResponse>
        {...tableState}
        actions={actions}
        columns={columns}
        transform={(data) => ({
          rows: data?.data?.items || [],
          cursor: data?.data?.metadata?.continue,
        })}>
        <div className="m-4 flex flex-col gap-2">
          <DataTable />
        </div>
      </DataTableProvider>
    </>
  );
}
