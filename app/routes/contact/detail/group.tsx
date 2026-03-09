import { getContactDetailMetadata, useContactDetailData } from '../shared';
import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeCondition, BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { useContactGroupSearch } from '@/hooks';
import {
  contactGroupMembershipCreateMutation,
  contactGroupMembershipDeleteMutation,
  contactMembershipForContactListQuery,
} from '@/resources/request/client';
import {
  ContactMembershipListWithContactGroups,
  ContactMembershipWithContactGroup,
} from '@/resources/schemas';
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
import { Form } from '@datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import z from 'zod';

export const handle = {
  breadcrumb: () => <Trans>Groups</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { contactName } = getContactDetailMetadata(matches);
  return metaObject(`Groups - ${contactName}`);
};

const columnHelper = createColumnHelper<ContactMembershipWithContactGroup>();
const columns = [
  columnHelper.accessor(
    (row) => row.contactGroup?.spec?.displayName ?? row.contactGroup?.metadata?.name ?? '',
    {
      id: 'name',
      header: () => <Trans>Name</Trans>,
      cell: ({ row }) => {
        const contactGroup = row.original.contactGroup;
        const contactGroupName = contactGroup?.metadata?.name ?? '';
        const displayName = contactGroup?.spec?.displayName ?? '';

        return (
          <DisplayName
            displayName={displayName}
            name={contactGroupName}
            to={contactGroupRoutes.detail(contactGroupName)}
          />
        );
      },
    }
  ),
  columnHelper.accessor((row) => row.contactGroup?.spec?.visibility ?? 'public', {
    id: 'visibility',
    header: () => <Trans>Visibility</Trans>,
    cell: ({ row }) => {
      const contactGroup = row.original.contactGroup;
      return <BadgeState state={contactGroup?.spec?.visibility ?? 'public'} />;
    },
  }),
  columnHelper.accessor((row) => row.contactGroup?.status ?? null, {
    id: 'status',
    header: () => <Trans>Status</Trans>,
    cell: ({ row }) => {
      const contactGroup = row.original.contactGroup;
      return (
        <BadgeCondition
          status={contactGroup?.status ?? null}
          multiple={false}
          showMessage
          className="text-xs"
        />
      );
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    id: 'metadata.creationTimestamp',
    header: () => <Trans>Joined</Trans>,
    cell: ({ getValue }) => <DateTime date={getValue()} />,
  }),
];

const globalFilterFn = createAdvancedSearch<ContactMembershipWithContactGroup>([
  (row) => row.contactGroup?.metadata?.name?.toLowerCase() || '',
  (row) => row.contactGroup?.spec?.displayName?.toLowerCase() || '',
  (row) => row.contactGroup?.spec?.visibility?.toLowerCase() || '',
  (row) => row.contactGroup?.spec?.description?.toLowerCase() || '',
]);

export default function Page() {
  const { t } = useLingui();
  const data = useContactDetailData();
  const [selectedGroup, setSelectedGroup] = useState<ContactMembershipWithContactGroup | null>(
    null
  );
  const [isAddGroup, setIsAddGroup] = useState(false);

  const { options: contactGroupOptions, isLoading: contactGroupsLoading } = useContactGroupSearch();

  const tableState = useClientDataTableQuery<ContactMembershipListWithContactGroups>({
    queryKeyPrefix: ['contacts', data.contact?.metadata?.name ?? '', 'groups'],
    fetchFn: () =>
      contactMembershipForContactListQuery({
        filters: { fieldSelector: `spec.contactRef.name=${data.contact?.metadata?.name ?? ''}` },
      }),
    defaultSort: ['metadata.creationTimestamp:desc'],
    useSorting: true,
    useSearch: true,
  });

  // Filter out contact groups that are already added to the contact
  const contactGroupFilteredOptions = useMemo(() => {
    return contactGroupOptions.filter((option) => {
      return !tableState.query.data?.items?.some((item) => {
        const name = [
          item.contactGroup?.metadata?.name ?? '',
          item.contactGroup?.metadata?.namespace ?? 'default',
        ].join('|');
        return name === option.value;
      });
    });
  }, [contactGroupOptions, tableState.query.data?.items]);

  const actions: ActionItem<ContactMembershipWithContactGroup>[] = [
    {
      label: 'Delete',
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedGroup(row),
    },
  ];

  const addGroupSchema = z.object({
    name: z.string().nonempty(t`Group is required`),
  });

  const handleAddGroup = async (formData: z.infer<typeof addGroupSchema>) => {
    try {
      const [name, namespace] = formData.name.split('|');
      await contactGroupMembershipCreateMutation('default', {
        contactGroupRef: { name, namespace },
        contactRef: {
          name: data.contact?.metadata?.name ?? '',
          namespace: data.contact?.metadata?.namespace ?? 'default',
        },
      });

      await new Promise((resolve) => setTimeout(() => resolve(tableState.query.refetch()), 1000));
      toast.success(t`Group added successfully`);
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
          await contactGroupMembershipDeleteMutation(selectedGroup?.metadata);
          await new Promise((resolve) =>
            setTimeout(() => resolve(tableState.query.refetch()), 2000)
          );
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
        <Form.Autocomplete
          modal
          field="name"
          placeholder={t`Select group...`}
          searchPlaceholder={t`Search groups...`}
          options={contactGroupFilteredOptions}
          isLoading={contactGroupsLoading}
        />
      </DialogForm>

      <ClientDataTableProvider<
        ContactMembershipWithContactGroup,
        ContactMembershipListWithContactGroups
      >
        {...tableState}
        columns={columns}
        actions={actions}
        transform={(data) => data?.items ?? []}
        globalFilterFn={globalFilterFn}>
        <div className="m-4 flex flex-col gap-2">
          <ClientDataTableSearch placeholder={t`Search groups...`} />
          <ClientDataTable />
        </div>
      </ClientDataTableProvider>
    </>
  );
}
