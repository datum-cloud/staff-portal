import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DisplayId, DisplayName } from '@/components/display';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { userListQuery } from '@/resources/request/client';
import { User, UserListResponse } from '@/resources/schemas';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';

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
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
  }),
];

export default function Page() {
  const tableState = useDataTableQuery<UserListResponse>({
    queryKeyPrefix: 'users',
    fetchFn: userListQuery,
    useSorting: true,
  });

  return (
    <DataTableProvider<User, UserListResponse>
      columns={columns}
      transform={(data) => {
        return {
          rows: data?.data?.items || [],
          cursor: data?.data?.metadata?.continue,
        };
      }}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable<User> />
      </div>
    </DataTableProvider>
  );
}
