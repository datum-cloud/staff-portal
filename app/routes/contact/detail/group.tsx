import { getContactDetailMetadata, useContactDetailData } from '../shared';
import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeCondition, BadgeState } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { useContactGroupSearch } from '@/hooks';
import {
  useCreateContactGroupMembershipMutation,
  useDeleteContactGroupMembershipMutation,
  useContactGroupMembershipListQuery,
} from '@/resources/request/client';
import type { ContactMembershipWithContactGroup } from '@/resources/schemas';
import { contactGroupRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import z from 'zod';

export const handle = { breadcrumb: () => <Trans>Groups</Trans> };

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Groups - ${contactName}`);
};

const columnHelper = createColumnHelper<ContactMembershipWithContactGroup>();

export default function Page() {
  const { t } = useLingui();
  const detail = useContactDetailData();
  const contactName = detail.contact?.metadata?.name ?? '';

  const tableQuery = useContactGroupMembershipListQuery(contactName);

  const items = tableQuery.data?.items ?? [];
  const [selectedGroup, setSelectedGroup] = useState<ContactMembershipWithContactGroup | null>(
    null
  );
  const [isAddGroup, setIsAddGroup] = useState(false);
  const createMembershipMutation = useCreateContactGroupMembershipMutation();
  const deleteMembershipMutation = useDeleteContactGroupMembershipMutation();
  const {
    options: contactGroupOptions,
    isLoading: contactGroupsLoading,
    setSearch: setContactGroupSearch,
  } = useContactGroupSearch();

  const contactGroupFilteredOptions = useMemo(() => {
    return contactGroupOptions.filter((option) => {
      return !items.some((item) => {
        const name = [
          item.contactGroup?.metadata?.name ?? '',
          item.contactGroup?.metadata?.namespace ?? 'default',
        ].join('|');
        return name === option.value;
      });
    });
  }, [contactGroupOptions, items]);

  const actions: ActionItem<ContactMembershipWithContactGroup>[] = [
    {
      label: t`Delete`,
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedGroup(row),
    },
  ];

  const columns = [
    columnHelper.accessor(
      (row) => row.contactGroup?.spec?.displayName ?? row.contactGroup?.metadata?.name ?? '',
      {
        id: 'name',
        header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
        cell: ({ row }) => {
          const cg = row.original.contactGroup;
          const n = cg?.metadata?.name ?? '';
          const d = cg?.spec?.displayName ?? '';
          return <DisplayName displayName={d} name={n} to={contactGroupRoutes.detail(n)} />;
        },
      }
    ),
    columnHelper.accessor((row) => row.contactGroup?.spec?.visibility ?? 'public', {
      id: 'visibility',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Visibility`} />,
      cell: ({ row }) => (
        <BadgeState state={row.original.contactGroup?.spec?.visibility ?? 'public'} />
      ),
    }),
    columnHelper.accessor((row) => row.contactGroup?.status ?? null, {
      id: 'status',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Status`} />,
      cell: ({ row }) => (
        <BadgeCondition
          status={row.original.contactGroup?.status ?? null}
          multiple={false}
          showMessage
          className="text-xs"
        />
      ),
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Joined`} />,
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

  const addGroupSchema = z.object({ name: z.string().nonempty(t`Group is required`) });

  const handleAddGroup = async (formData: z.infer<typeof addGroupSchema>) => {
    const [name, namespace] = formData.name.split('|');
    await createMembershipMutation.mutateAsync({
      namespace: 'default',
      payload: {
        contactGroupRef: { name, namespace },
        contactRef: {
          name: detail.contact?.metadata?.name ?? '',
          namespace: detail.contact?.metadata?.namespace ?? 'default',
        },
      },
    });
    toast.success(t`Group added successfully`);
  };

  return (
    <>
      <AppActionBar>
        <Button
          type="primary"
          icon={<PlusCircleIcon size={16} />}
          onClick={() => setIsAddGroup(true)}>
          <Trans>Add</Trans>
        </Button>
      </AppActionBar>
      <DialogConfirm
        open={!!selectedGroup}
        onOpenChange={() => setSelectedGroup(null)}
        title={t`Delete Member`}
        description={t`Are you sure you want to delete group "${selectedGroup?.contactGroup?.spec?.displayName ?? ''}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await deleteMembershipMutation.mutateAsync(selectedGroup?.metadata);
          setSelectedGroup(null);
          toast.success(t`Group deleted successfully`);
        }}
      />
      <DialogForm
        open={isAddGroup}
        onOpenChange={() => setIsAddGroup(false)}
        title={t`Add Group`}
        submitText={t`Add`}
        cancelText={t`Cancel`}
        onSubmit={handleAddGroup}
        schema={addGroupSchema}
        defaultValues={{ name: '' }}>
        <Form.Field name="name">
          <Form.Autocomplete
            modal
            placeholder={t`Select group...`}
            searchPlaceholder={t`Search groups...`}
            options={contactGroupFilteredOptions}
            loading={contactGroupsLoading}
            onSearchChange={(query) => setContactGroupSearch(query)}
          />
        </Form.Field>
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
          const cg = row.contactGroup;
          return [
            cg?.metadata?.name,
            cg?.spec?.displayName,
            cg?.spec?.visibility,
            cg?.spec?.description,
          ]
            .map((s) => (s ?? '').toLowerCase())
            .some((s) => s.includes(q));
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search placeholder={t`Search groups...`} className="w-full md:w-64" />
              }
            />
            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No groups found.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
