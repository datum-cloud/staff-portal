import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DisplayId, DisplayName } from '@/components/display';
import { UserRejectDialog, useUserApproval } from '@/features/user';
import { userListQuery } from '@/resources/request/client';
import { User, UserListResponse } from '@/resources/schemas';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import {
  ActionItem,
  DataTable,
  DataTableFacetFilter,
  DataTableProvider,
  useDataTableQuery,
} from '@datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckIcon, EditIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Users`);
};

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor('spec.givenName', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const userName = row.original.metadata.name;
      const displayName = `${row.original.spec.givenName} ${row.original.spec.familyName}`;
      const email = row.original.spec.email;

      return <DisplayName displayName={displayName} name={email} to={`./${userName}`} />;
    },
  }),
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>ID</Trans>,
    cell: ({ getValue }) => {
      return <DisplayId value={getValue()} />;
    },
  }),
  columnHelper.accessor('status.state', {
    header: () => <Trans>Status</Trans>,
    cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Active'} />,
  }),
  columnHelper.accessor('status.registrationApproval', {
    header: () => <Trans>Registration Approval</Trans>,
    cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Unknown'} />,
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
  }),
];

export default function Page() {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { approveUser } = useUserApproval();

  const tableState = useDataTableQuery<UserListResponse>({
    queryKeyPrefix: ['users'],
    fetchFn: (args) => userListQuery(args),
    useSorting: true,
    useFilters: true,
    useSearch: true,
  });

  const actions: ActionItem<User>[] = [
    {
      label: t`Manage`,
      icon: EditIcon,
      onClick: (row) => navigate(userRoutes.detail(row.metadata.name)),
    },
    {
      label: t`Approve`,
      icon: CheckIcon,
      disabled: (row) => row.status?.registrationApproval !== 'Pending',
      onClick: async (row) => {
        setLoadingStates((prev) => ({ ...prev, [row.metadata.name]: true }));
        try {
          await approveUser(row, async () => {
            await new Promise((resolve) =>
              setTimeout(() => resolve(tableState.query.refetch()), 1000)
            );
          });
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.metadata.name]: false }));
        }
      },
    },
    {
      label: t`Reject`,
      icon: XIcon,
      variant: 'destructive' as const,
      disabled: (row) => row.status?.registrationApproval !== 'Pending',
      onClick: (row) => setSelectedUser(row),
    },
  ];

  return (
    <>
      <UserRejectDialog
        open={!!selectedUser}
        onOpenChange={() => setSelectedUser(null)}
        user={selectedUser}
        onSuccess={async () => {
          await new Promise((resolve) =>
            setTimeout(() => resolve(tableState.query.refetch()), 1000)
          );
        }}
      />

      <DataTableProvider<User, UserListResponse>
        columns={columns}
        actions={actions}
        actionsLoading={(row) => loadingStates[row.metadata.name] || false}
        transform={(data) => {
          return {
            rows: data?.data?.items || [],
            cursor: data?.data?.metadata?.continue,
          };
        }}
        {...tableState}>
        <div className="m-4 flex flex-col gap-2">
          <div className="flex items-center gap-4">
            {/* <DataTableSearch
              placeholder={t`Search users...`}
              value={tableState.search}
              onValueChange={tableState.setSearch || (() => {})}
            /> */}

            <DataTableFacetFilter
              label={t`Registration Approval`}
              placeholder={t`Filter by approval`}
              options={[
                { value: 'Approved', label: t`Approved` },
                { value: 'Rejected', label: t`Rejected` },
                { value: 'Pending', label: t`Pending` },
              ]}
              value={tableState.filters.registrationApproval}
              onValueChange={(value) => {
                if (value) tableState.setFilter('registrationApproval', value);
                else tableState.clearFilter('registrationApproval');
              }}
            />
          </div>

          <DataTable<User> />
        </div>
      </DataTableProvider>
    </>
  );
}
