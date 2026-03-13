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
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Form } from '@datum-ui/form';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
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

export default function Page() {
  const { t } = useLingui();
  const groupData = useContactGroupDetailData();
  const groupName = groupData.metadata?.name ?? '';

  const tableQuery = useQuery({
    queryKey: ['contact-groups', groupName, 'members', 'list'],
    queryFn: () =>
      contactMembershipForGroupListQuery({
        filters: { fieldSelector: `spec.contactGroupRef.name=${groupName}` },
      }),
    enabled: !!groupName,
  });

  const [selectedMembership, setSelectedMembership] =
    useState<ContactGroupMembershipWithContact | null>(null);
  const [isAddMember, setIsAddMember] = useState(false);
  const {
    options: contactOptions,
    isLoading: contactsLoading,
    setSearch: setContactSearch,
  } = useContactSearch();

  const items =
    (tableQuery.data as ContactGroupMembershipListWithContacts | undefined)?.items ?? [];

  const actions: ActionItem<ContactGroupMembershipWithContact>[] = [
    {
      label: t`Delete`,
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedMembership(row),
    },
  ];

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
        header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
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
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Email`} />,
      cell: ({ row }) => row.original.contact?.spec?.email ?? '—',
    }),
    columnHelper.accessor((row) => row.contact?.status ?? null, {
      id: 'status',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Status`} />,
      cell: ({ row }) => {
        const contact = row.original.contact;
        if (!contact?.status) return '—';
        return (
          <BadgeCondition
            status={contact.status}
            multiple={false}
            showMessage
            className="text-xs"
          />
        );
      },
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Added`} />,
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
    const [name, namespace] = formData.name.split('|');
    await contactGroupMembershipCreateMutation('default', {
      contactGroupRef: {
        name: groupData.metadata?.name ?? '',
        namespace: groupData.metadata?.namespace ?? 'default',
      },
      contactRef: { name, namespace },
    });
    await new Promise((resolve) => setTimeout(() => resolve(tableQuery.refetch()), 1000));
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
        description={t`Are you sure you want to delete member "${deleteMemberDisplayName}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await contactGroupMembershipDeleteMutation(selectedMembership?.metadata);
          await new Promise((resolve) => setTimeout(() => resolve(tableQuery.refetch()), 2000));
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

      <DataTable.Client
        loading={tableQuery.isLoading}
        data={items}
        columns={columns}
        pageSize={20}
        getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          const c = row.contact;
          return [
            c?.metadata?.name,
            c?.spec?.givenName,
            c?.spec?.familyName,
            c?.spec?.email,
            `${c?.spec?.givenName || ''} ${c?.spec?.familyName || ''}`.trim(),
          ]
            .map((s) => (s ?? '').toLowerCase())
            .some((s) => s.includes(q));
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTable.Search placeholder={t`Search members...`} className="w-64" />
            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No members found.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
