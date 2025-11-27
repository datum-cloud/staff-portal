import { getContactGroupDetailMetadata, useContactGroupDetailData } from '../shared';
import type { Route } from './+types/member';
import AppActionBar from '@/components/app-actiobar';
import { DateFormatter } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { useContactSearch } from '@/hooks';
import {
  contactGroupMembershipCreateMutation,
  contactGroupMembershipDeleteMutation,
  contactGroupMembershipListQuery,
} from '@/resources/request/client';
import { ContactGroupMembership, ContactGroupMembershipListResponse } from '@/resources/schemas';
import { contactRoutes } from '@/utils/config/routes.config';
import { generateMetadataName, metaObject } from '@/utils/helpers';
import { Button } from '@datum-ui/button';
import { ActionItem, DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
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

const columnHelper = createColumnHelper<ContactGroupMembership>();
const columns = [
  columnHelper.accessor('spec.contactRef.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const namespace = row.original.spec.contactRef.namespace;
      const contactName = row.original.spec.contactRef.name;
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
    cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
  }),
];

export default function Page() {
  const { t } = useLingui();
  const data = useContactGroupDetailData();
  const [selectedMembership, setSelectedMembership] = useState<ContactGroupMembership | null>(null);
  const [isAddMember, setIsAddMember] = useState(false);

  const {
    options: contactOptions,
    isLoading: contactsLoading,
    setSearch: setContactSearch,
  } = useContactSearch();

  const tableState = useDataTableQuery<ContactGroupMembershipListResponse>({
    queryKeyPrefix: ['contact-groups', data.metadata.name, 'members'],
    fetchFn: (params) =>
      contactGroupMembershipListQuery({
        ...params,
        filters: { fieldSelector: `spec.contactGroupRef.name=${data.metadata.name}` },
      }),
    useSorting: true,
  });

  const actions: ActionItem<ContactGroupMembership>[] = [
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
    await contactGroupMembershipCreateMutation({
      apiVersion: 'notification.miloapis.com/v1alpha1',
      kind: 'ContactGroupMembership',
      metadata: {
        generateName: 'contact-group-membership-',
        namespace: 'default',
      },
      spec: {
        contactGroupRef: { name: data.metadata.name, namespace: 'default' },
        contactRef: { name: formData.name, namespace: 'default' },
      },
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
          await contactGroupMembershipDeleteMutation(selectedMembership?.metadata?.name ?? '');
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
        <Form.Autocomplete
          modal
          field="name"
          placeholder={contactsLoading ? t`Loading contacts...` : t`Select a contact...`}
          searchPlaceholder={t`Search contacts...`}
          options={contactOptions}
          isLoading={contactsLoading}
          onSearch={setContactSearch}
          searchDebounceMs={300}
          disabled={contactsLoading}
        />
      </DialogForm>

      <DataTableProvider<ContactGroupMembership, ContactGroupMembershipListResponse>
        {...tableState}
        columns={columns}
        actions={actions}
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
