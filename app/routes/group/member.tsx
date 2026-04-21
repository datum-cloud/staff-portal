import type { Route } from './+types/member';
import { getGroupDetailMetadata, useGroupDetailData } from './shared';
import AppActionBar from '@/components/app-actiobar';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogConfirm, DialogForm } from '@/components/dialog';
import { DisplayName } from '@/components/display';
import { useUserSearch } from '@/hooks';
import { authenticator } from '@/modules/auth';
import {
  useCreateGroupMembershipMutation,
  useDeleteGroupMembershipMutation,
  useGroupMembershipListQuery,
  useUserListQuery,
} from '@/resources/request/client';
import { groupDetailQuery } from '@/resources/request/server';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  ComMiloapisIamV1Alpha1Group,
  ComMiloapisIamV1Alpha1GroupMembership,
} from '@openapi/iam.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusCircleIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

export default function Page() {
  const { t } = useLingui();
  const group = useGroupDetailData();
  const groupName = group.metadata?.name ?? '';
  const tableQuery = useGroupMembershipListQuery(groupName);
  const userListQueryResult = useUserListQuery({ limit: 500 });
  const createMembershipMutation = useCreateGroupMembershipMutation();
  const deleteMembershipMutation = useDeleteGroupMembershipMutation();

  const userMap = useMemo(() => {
    const map = new Map<string, { displayName: string; email: string }>();
    for (const user of userListQueryResult.data?.items ?? []) {
      const name = user.metadata?.name ?? '';
      if (name) {
        map.set(name, {
          displayName:
            `${user.spec?.givenName ?? ''} ${user.spec?.familyName ?? ''}`.trim() || name,
          email: user.spec?.email ?? '',
        });
      }
    }
    return map;
  }, [userListQueryResult.data]);

  const userMapRef = useRef(userMap);
  useEffect(() => {
    userMapRef.current = userMap;
  }, [userMap]);

  const [selectedGroupMembership, setSelectedGroupMembership] =
    useState<ComMiloapisIamV1Alpha1GroupMembership | null>(null);
  const [isAddMember, setIsAddMember] = useState(false);

  const {
    options: userOptions,
    isLoading: usersLoading,
    setSearch: setUserSearch,
  } = useUserSearch();

  const actions: ActionItem<ComMiloapisIamV1Alpha1GroupMembership>[] = [
    {
      label: t`Delete`,
      icon: Trash2Icon,
      variant: 'destructive' as const,
      onClick: (row) => setSelectedGroupMembership(row),
    },
  ];

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const userRefName = row.original.spec?.userRef?.name ?? '';
        const user = userMap.get(userRefName);
        const displayName = user?.displayName || userRefName;
        const email = user?.email ?? '';

        return (
          <DisplayName
            displayName={displayName}
            name={email || userRefName}
            to={userRoutes.detail(userRefName)}
          />
        );
      },
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
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

  const addMemberSchema = z.object({
    name: z.string().nonempty('User is required'),
  });

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
          await deleteMembershipMutation.mutateAsync(selectedGroupMembership?.metadata);
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
        onSubmit={async (formData) => {
          try {
            await createMembershipMutation.mutateAsync({
              namespace: 'milo-system',
              payload: {
                groupRef: { name: groupName, namespace: 'milo-system' },
                userRef: { name: formData.name },
              },
            });
            toast.success(t`Member added successfully`);
          } catch (error) {
            throw error;
          }
        }}
        schema={addMemberSchema}
        defaultValues={{ name: '' }}>
        <Form.Field name="name">
          <Form.Autosearch
            modal
            options={userOptions}
            loading={usersLoading}
            onSearch={setUserSearch}
            searchDebounceMs={500}
            placeholder={t`Enter the full email to search...`}
          />
        </Form.Field>
      </DialogForm>

      <DataTable.Client
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={20}
        getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          const userRefName = row.spec?.userRef?.name ?? '';
          const user = userMapRef.current.get(userRefName);
          const displayName = (user?.displayName ?? '').toLowerCase();
          const email = (user?.email ?? '').toLowerCase();
          return displayName.includes(q) || email.includes(q) || userRefName.toLowerCase().includes(q);
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search placeholder={t`Search members...`} className="w-full md:w-64" />
              }
            />

            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No members in this group.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
