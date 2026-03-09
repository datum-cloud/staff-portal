import type { Route } from './+types/member';
import { getGroupDetailMetadata, useGroupDetailData } from './shared';
import AppActionBar from '@/components/app-actiobar';
import { DateTime } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { useUserSearch } from '@/hooks';
import { authenticator } from '@/modules/auth';
import {
  groupMembershipCreateMutation,
  groupMembershipDeleteMutation,
  groupMembershipListQuery,
} from '@/resources/request/client';
import { groupDetailQuery } from '@/resources/request/server';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Button } from '@datum-ui/button';
import { ActionItem, DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { Form } from '@datum-ui/form';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  ComMiloapisIamV1Alpha1Group,
  ComMiloapisIamV1Alpha1GroupMembership,
  ComMiloapisIamV1Alpha1GroupMembershipList,
} from '@openapi/iam.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import z from 'zod';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { groupName } = getGroupDetailMetadata(matches);
  return metaObject(`Members - ${groupName}`);
};

export const handle = {
  breadcrumb: (data: ComMiloapisIamV1Alpha1Group) => {
    return <span>{data.metadata?.name ?? ''}</span>;
  },
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const data = await groupDetailQuery(session?.accessToken ?? '', params?.groupName ?? '');

  return data;
};

const columnHelper = createColumnHelper<ComMiloapisIamV1Alpha1GroupMembership>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const groupName = row.original.metadata?.name ?? '';
      const displayName = row.original.metadata?.namespace;

      return (
        <DisplayName
          displayName={groupName}
          name={displayName || groupName}
          to={userRoutes.detail(row.original.spec?.userRef?.name ?? '')}
        />
      );
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => <DateTime date={getValue()} />,
  }),
];

export default function Page() {
  const { t } = useLingui();
  const data = useGroupDetailData();
  const [selectedGroupMembership, setSelectedGroupMembership] =
    useState<ComMiloapisIamV1Alpha1GroupMembership | null>(null);
  const [isAddMember, setIsAddMember] = useState(false);

  const {
    options: userOptions,
    isLoading: usersLoading,
    setSearch: setUserSearch,
  } = useUserSearch();

  const tableState = useDataTableQuery<ComMiloapisIamV1Alpha1GroupMembershipList>({
    queryKeyPrefix: ['groups', data.metadata?.name ?? '', 'members'],
    fetchFn: (params) =>
      groupMembershipListQuery({
        ...params,
        filters: { fieldSelector: `spec.groupRef.name=${data.metadata?.name ?? ''}` },
      }),
    useSorting: true,
  });

  const actions: ActionItem<ComMiloapisIamV1Alpha1GroupMembership>[] = [
    {
      label: 'Delete',
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedGroupMembership(row),
    },
  ];

  const addMemberSchema = z.object({
    name: z.string().nonempty('User is required'),
  });

  const handleAddMember = async (formData: z.infer<typeof addMemberSchema>) => {
    try {
      await groupMembershipCreateMutation('milo-system', {
        groupRef: { name: data.metadata?.name ?? '', namespace: 'milo-system' },
        userRef: { name: formData.name },
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
        open={!!selectedGroupMembership}
        onOpenChange={() => setSelectedGroupMembership(null)}
        title={t`Delete Member`}
        description={t`Are you sure you want to delete member "${selectedGroupMembership?.metadata?.name ?? ''}"? This action cannot be undone.`}
        confirmText={t`Delete`}
        cancelText={t`Cancel`}
        variant="destructive"
        onConfirm={async () => {
          await groupMembershipDeleteMutation(selectedGroupMembership?.metadata);
          await new Promise((resolve) =>
            setTimeout(() => resolve(tableState.query.refetch()), 1000)
          );
          setSelectedGroupMembership(null);
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
          options={userOptions}
          isLoading={usersLoading}
          onSearch={setUserSearch}
          searchDebounceMs={500}
        />
      </DialogForm>

      <DataTableProvider<
        ComMiloapisIamV1Alpha1GroupMembership,
        ComMiloapisIamV1Alpha1GroupMembershipList
      >
        {...tableState}
        columns={columns}
        actions={actions}
        transform={(data) => ({
          rows: data?.items || [],
          cursor: data?.metadata?.continue,
        })}>
        <div className="m-4 flex flex-col gap-2">
          <DataTable />
        </div>
      </DataTableProvider>
    </>
  );
}
