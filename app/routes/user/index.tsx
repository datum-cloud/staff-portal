import type { Route } from './+types/index';
import IDDisplay from '@/components/id-display';
import { DataTable } from '@/modules/data-table/components/data-table';
import { useDataTableQuery } from '@/modules/data-table/hooks/useDataTableQuery';
import { DataTableProvider } from '@/modules/data-table/providers/data-table.provider';
import { userListQuery } from '@/resources/request/client/user.request';
import { User, UserListResponse } from '@/resources/schemas/user.schema';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Users`);
};

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor('spec.givenName', {
    header: () => <Trans>Full Name</Trans>,
    cell: ({ row }) => {
      return (
        <Link to={`./${row.original.metadata.name}`}>
          {row.original.spec.givenName} {row.original.spec.familyName}
        </Link>
      );
    },
  }),
  columnHelper.accessor('spec.email', {
    header: () => <Trans>Email</Trans>,
  }),
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>ID</Trans>,
    cell: ({ getValue }) => {
      return <IDDisplay value={getValue()} />;
    },
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
