import { getContactGroupDetailMetadata, useContactGroupDetailData } from '../shared';
import type { Route } from './+types/member';
import AppActionBar from '@/components/app-actiobar';
import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { useContactSearch, useUserSearch } from '@/hooks';
import {
  contactCreateMutation,
  useCreateContactGroupMembershipMutation,
  useDeleteContactGroupMembershipMutation,
  useContactGroupMemberListQuery,
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

  const tableQuery = useContactGroupMemberListQuery(groupName);

  const items =
    (tableQuery.data as ContactGroupMembershipListWithContacts | undefined)?.items ?? [];

  const [selectedMembership, setSelectedMembership] =
    useState<ContactGroupMembershipWithContact | null>(null);
  const [isAddMember, setIsAddMember] = useState(false);
  const createMembershipMutation = useCreateContactGroupMembershipMutation();
  const deleteMembershipMutation = useDeleteContactGroupMembershipMutation();
  const {
    options: contactOptions,
    isLoading: contactsLoading,
    setSearch: setContactSearch,
    searchQuery: contactSearchQuery,
  } = useContactSearch();
  const {
    options: userOptions,
    isLoading: usersLoading,
    setSearch: setUserSearch,
  } = useUserSearch();

  const isEmailNotFound = useMemo(() => {
    const trimmed = contactSearchQuery.trim();
    if (!trimmed) return false;
    if (contactsLoading) return false;
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return looksLikeEmail && contactOptions.length === 0;
  }, [contactSearchQuery, contactOptions.length, contactsLoading]);

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

  const addMemberSchema = z
    .object({
      name: z.string().optional(),
      create_new: z.boolean().optional(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      has_association: z.boolean().optional(),
      subject: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.create_new) {
          return !!data.first_name && !!data.last_name;
        }
        return !!data.name;
      },
      {
        message: t`Please select an existing contact or provide details to create a new one`,
        path: ['name'],
      }
    )
    .refine(
      (data) => {
        if (!data.create_new || !data.has_association) {
          return true;
        }
        return !!data.subject;
      },
      {
        message: t`Subject is required when user association is enabled`,
        path: ['subject'],
      }
    );

  const handleAddMember = async (formData: z.infer<typeof addMemberSchema>) => {
    try {
      let contactName = '';
      let contactNamespace = 'default';

      if (formData.create_new) {
        const emailFromSearch = contactSearchQuery.trim();

        const response = await contactCreateMutation('default', {
          familyName: formData.last_name ?? '',
          givenName: formData.first_name ?? '',
          email: emailFromSearch,
          ...(formData.has_association &&
            formData.subject && {
              subject: {
                apiGroup: 'iam.miloapis.com',
                kind: 'User',
                name: formData.subject,
                namespace: '',
              },
            }),
        });

        contactName = response.metadata?.name ?? '';
        contactNamespace = response.metadata?.namespace ?? 'default';
      } else {
        const [name, namespace] = (formData.name ?? '').split('|');
        contactName = name;
        contactNamespace = namespace || 'default';
      }

      await createMembershipMutation.mutateAsync({
        namespace: 'default',
        payload: {
          contactGroupRef: {
            name: groupData.metadata?.name ?? '',
            namespace: groupData.metadata?.namespace ?? 'default',
          },
          contactRef: { name: contactName, namespace: contactNamespace },
        },
      });

      toast.success(
        formData.create_new
          ? t`Contact created and added to the group`
          : t`Member added successfully`
      );
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
          await deleteMembershipMutation.mutateAsync(selectedMembership?.metadata);
          setSelectedMembership(null);
          toast.success(t`Member deleted successfully`);
        }}
      />

      <DialogForm
        open={isAddMember}
        onOpenChange={(open) => {
          if (!open) setContactSearch('');
          setIsAddMember(open);
        }}
        title={t`Add Member`}
        submitText={t`Add`}
        cancelText={t`Cancel`}
        onSubmit={handleAddMember}
        schema={addMemberSchema}
        defaultValues={{
          name: '',
          create_new: false,
          first_name: '',
          last_name: '',
          has_association: false,
          subject: '',
        }}>
        {(form) => {
          const createNew = form.watch('create_new');
          const hasAssociation = form.watch('has_association');

          return (
            <>
              <Form.Autosearch
                modal
                field="name"
                placeholder={t`Search for an existing contact by email...`}
                options={contactOptions}
                isLoading={contactsLoading}
                onSearch={(query) => {
                  if (createNew) return;
                  setContactSearch(query);
                }}
                disabled={createNew}
                searchDebounceMs={500}
                emptyMessage={
                  isEmailNotFound
                    ? t`No contacts found with this email. You can create a new contact below.`
                    : t`No contacts found.`
                }
              />

              {isEmailNotFound && (
                <>
                  <Form.Switch field="create_new" label={t`Create a new contact with this email`} />

                  {createNew && (
                    <>
                      <Form.Input field="first_name" label={t`First name`} required />
                      <Form.Input field="last_name" label={t`Last name`} required />

                      <Form.Switch field="has_association" label={t`Associate with User`} />
                      {hasAssociation && (
                        <Form.Autosearch
                          field="subject"
                          placeholder={t`Enter the full email to search...`}
                          options={userOptions}
                          isLoading={usersLoading}
                          onSearch={setUserSearch}
                          searchDebounceMs={500}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </>
          );
        }}
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
