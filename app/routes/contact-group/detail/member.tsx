import { getContactGroupDetailMetadata, useContactGroupDetailData } from '../shared';
import type { Route } from './+types/member';
import AppActionBar from '@/components/app-actiobar';
import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { useContactSearch } from '@/hooks';
import {
  contactGroupMembershipCreateMutation,
  contactGroupMembershipDeleteMutation,
  contactMembershipForGroupListQuery,
} from '@/resources/request/client';
import {
  ContactGroupMembershipListWithContacts,
  ContactGroupMembershipWithContact,
} from '@/resources/schemas';
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
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import z from 'zod';

export const handle = {
  breadcrumb: () => <Trans>Members</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactGroupName } = getContactGroupDetailMetadata(matches);
  return metaObject(`Members - ${contactGroupName}`);
};

const columnHelper = createColumnHelper<ContactGroupMembershipWithContact>();
const columns = [
  columnHelper.accessor(
    (row) => {
      const contact = row.contact;
      const contactName = contact?.metadata?.name ?? row.spec?.contactRef?.name ?? '';
      const displayName = [contact?.spec?.givenName, contact?.spec?.familyName]
        .filter(Boolean)
        .join(' ');
      return displayName || contactName || '';
    },
    {
      id: 'name',
      header: () => <Trans>Name</Trans>,
      cell: ({ row }) => {
        const contact = row.original.contact;
        const contactNamespace =
          contact?.metadata?.namespace ?? row.original.spec?.contactRef?.namespace;
        const contactName = contact?.metadata?.name ?? row.original.spec?.contactRef?.name;
        const displayName = [contact?.spec?.givenName, contact?.spec?.familyName]
          .filter(Boolean)
          .join(' ');

        return (
          <DisplayName
            displayName={displayName || contactName || ''}
            name={contactName}
            to={contactRoutes.detail(contactNamespace ?? '', contactName ?? '')}
          />
        );
      },
    }
  ),
  columnHelper.accessor((row) => row.contact?.spec?.email ?? '—', {
    id: 'email',
    header: () => <Trans>Email</Trans>,
    cell: ({ row }) => row.original.contact?.spec?.email ?? '—',
  }),
  columnHelper.accessor((row) => row.contact?.status ?? null, {
    id: 'status',
    header: () => <Trans>Status</Trans>,
    cell: ({ row }) => {
      const contact = row.original.contact;
      if (!contact?.status) return '—';
      return (
        <BadgeCondition status={contact.status} multiple={false} showMessage className="text-xs" />
      );
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    id: 'metadata.creationTimestamp',
    header: () => <Trans>Added</Trans>,
    cell: ({ getValue }) => <DateTime date={getValue()} />,
  }),
];

const globalFilterFn = createAdvancedSearch<ContactGroupMembershipWithContact>([
  (row) => row.contact?.metadata?.name?.toLowerCase() || '',
  (row) => row.contact?.spec?.givenName?.toLowerCase() || '',
  (row) => row.contact?.spec?.familyName?.toLowerCase() || '',
  (row) => row.contact?.spec?.email?.toLowerCase() || '',
  (row) =>
    `${row.contact?.spec?.givenName || ''} ${row.contact?.spec?.familyName || ''}`
      .trim()
      .toLowerCase(),
]);

export default function Page() {
  const { t } = useLingui();
  const data = useContactGroupDetailData();
  const [selectedMembership, setSelectedMembership] =
    useState<ContactGroupMembershipWithContact | null>(null);
  const [isAddMember, setIsAddMember] = useState(false);

  const {
    options: contactOptions,
    isLoading: contactsLoading,
    setSearch: setContactSearch,
  } = useContactSearch();

  const tableState = useClientDataTableQuery<ContactGroupMembershipListWithContacts>({
    queryKeyPrefix: ['contact-groups', data.metadata?.name ?? '', 'members'],
    fetchFn: () =>
      contactMembershipForGroupListQuery({
        filters: { fieldSelector: `spec.contactGroupRef.name=${data.metadata?.name ?? ''}` },
      }),
    defaultSort: ['metadata.creationTimestamp:desc'],
    useSorting: true,
    useSearch: true,
  });

  const actions: ActionItem<ContactGroupMembershipWithContact>[] = [
    {
      label: 'Delete',
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedMembership(row),
    },
  ];

  const deleteMemberDisplayName = useMemo(() => {
    if (!selectedMembership) return '';
    const contact = selectedMembership.contact;
    if (contact) {
      const name = [contact.spec?.givenName, contact.spec?.familyName].filter(Boolean).join(' ');
      return name || (selectedMembership.spec?.contactRef?.name ?? '');
    }
    return selectedMembership.spec?.contactRef?.name ?? '';
  }, [selectedMembership]);

  const addMemberSchema = z.object({
    name: z.string().nonempty(t`Member is required`),
  });

  const handleAddMember = async (formData: z.infer<typeof addMemberSchema>) => {
    try {
      const [name, namespace] = formData.name.split('|');
      await contactGroupMembershipCreateMutation('default', {
        contactGroupRef: {
          name: data.metadata?.name ?? '',
          namespace: data.metadata?.namespace ?? 'default',
        },
        contactRef: { name, namespace },
      });

      await new Promise((resolve) => setTimeout(() => resolve(tableState.query.refetch()), 1000));
      toast.success(t`Member added successfully`);
    } catch (error) {
      throw error; // Re-throw to keep dialog open
    }
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
        description={t`Are you sure you want to delete member "${deleteMemberDisplayName}"? This action cannot be undone.`}
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

      <ClientDataTableProvider<
        ContactGroupMembershipWithContact,
        ContactGroupMembershipListWithContacts
      >
        {...tableState}
        columns={columns}
        actions={actions}
        transform={(data) => data?.items ?? []}
        globalFilterFn={globalFilterFn}>
        <div className="m-4 flex flex-col gap-2">
          <ClientDataTableSearch placeholder={t`Search members...`} />
          <ClientDataTable />
        </div>
      </ClientDataTableProvider>
    </>
  );
}
