import { getContactGroupDetailMetadata, useContactGroupDetailData } from '../shared';
import type { Route } from './+types/member';
import AppActionBar from '@/components/app-actiobar';
import { DateTime } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { useContactSearch } from '@/hooks';
import {
  contactGroupMembershipCreateMutation,
  contactGroupMembershipDeleteMutation,
  contactGroupMembershipListQuery,
} from '@/resources/request/client';
import { contactRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-ui/button';
import { ActionItem, DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  ComMiloapisNotificationV1Alpha1ContactGroupMembership,
  ComMiloapisNotificationV1Alpha1ContactGroupMembershipList,
} from '@openapi/notification.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import z from 'zod';

export const handle = {
  breadcrumb: () => <Trans>Members</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactGroupName } = getContactGroupDetailMetadata(matches);
  return metaObject(`Members - ${contactGroupName}`);
};

const columnHelper = createColumnHelper<ComMiloapisNotificationV1Alpha1ContactGroupMembership>();
const columns = [
  columnHelper.accessor('spec.contactRef.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const namespace = row.original.spec?.contactRef?.namespace ?? '';
      const contactName = row.original.spec?.contactRef?.name ?? '';
      return (
        <DisplayName
          displayName={contactName}
          name={contactName}
          to={contactRoutes.edit(namespace, contactName)}
        />
      );
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Added</Trans>,
    cell: ({ getValue }) => <DateTime date={getValue()} />,
  }),
];

export default function Page() {
  const { t } = useLingui();
  const data = useContactGroupDetailData();
  const [selectedMembership, setSelectedMembership] =
    useState<ComMiloapisNotificationV1Alpha1ContactGroupMembership | null>(null);
  const [isAddMember, setIsAddMember] = useState(false);

  const {
    options: contactOptions,
    isLoading: contactsLoading,
    setSearch: setContactSearch,
  } = useContactSearch();

  const tableState = useDataTableQuery<ComMiloapisNotificationV1Alpha1ContactGroupMembershipList>({
    queryKeyPrefix: ['contact-groups', data.metadata?.name ?? '', 'members'],
    fetchFn: (params) =>
      contactGroupMembershipListQuery({
        ...params,
        filters: { fieldSelector: `spec.contactGroupRef.name=${data.metadata?.name ?? ''}` },
      }),
    useSorting: true,
  });

  const actions: ActionItem<ComMiloapisNotificationV1Alpha1ContactGroupMembership>[] = [
    {
      label: 'Delete',
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedMembership(row),
    },
  ];

  const addMemberSchema = z.object({
    name: z.string().nonempty(t`Name is required`),
  });

  const handleAddMember = async (formData: z.infer<typeof addMemberSchema>) => {
    await contactGroupMembershipCreateMutation('default', {
      contactGroupRef: { name: data.metadata?.name ?? '', namespace: 'default' },
      contactRef: { name: formData.name, namespace: 'default' },
    });

    await new Promise((resolve) => setTimeout(() => resolve(tableState.query.refetch()), 1000));
    toast.success(t`Member added successfully`);
  };

  return (
    <>
      <AppActionBar>
        <Button
          type="primary"
          icon={<PlusCircleIcon size={16} />}
          onClick={() => setIsAddMember(true)}>
          <Trans>Add</Trans>
        </Button>
      </AppActionBar>

      <DialogConfirm
        open={!!selectedMembership}
        onOpenChange={() => setSelectedMembership(null)}
        title={t`Delete Member`}
        description={t`Are you sure you want to delete member "${selectedMembership?.spec?.contactRef?.name ?? ''}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await contactGroupMembershipDeleteMutation(selectedMembership?.metadata);
          await new Promise((resolve) =>
            setTimeout(() => resolve(tableState.query.refetch()), 2000)
          );
          setSelectedMembership(null);
          toast.success(t`Member deleted successfully`);
        }}
      />

      <DialogForm
        open={isAddMember}
        onOpenChange={() => setIsAddMember(false)}
        title={t`Add Member`}
        submitText={t`Add`}
        cancelText={t`Cancel`}
        onSubmit={handleAddMember}
        schema={addMemberSchema}
        defaultValues={{ name: '' }}>
        <Form.Autosearch
          modal
          field="name"
          placeholder={t`Enter the full email to search...`}
          options={contactOptions}
          isLoading={contactsLoading}
          onSearch={setContactSearch}
          searchDebounceMs={500}
        />
      </DialogForm>

      <DataTableProvider<
        ComMiloapisNotificationV1Alpha1ContactGroupMembership,
        ComMiloapisNotificationV1Alpha1ContactGroupMembershipList
      >
        {...tableState}
        columns={columns}
        actions={actions}
        transform={(data) => ({
          rows: data.items || [],
          cursor: data.metadata?.continue,
        })}>
        <div className="m-4 flex flex-col gap-2">
          <DataTable />
        </div>
      </DataTableProvider>
    </>
  );
}
