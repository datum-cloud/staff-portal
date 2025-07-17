import type { Route } from './+types/index';
import { DataTable } from '@/modules/data-table/components/data-table';
import { useDataTableQuery } from '@/modules/data-table/hooks/useDataTableQuery';
import { DataTableProvider } from '@/modules/data-table/providers/data-table.provider';
import { userQuery } from '@/resources/request/client/user.request';
import { User, UserResponse } from '@/resources/schemas/user.schema';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Users');
};

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor('metadata.name', {
    header: 'ID',
    cell: ({ getValue }) => {
      return <Link to={`./${getValue()}`}>{getValue()}</Link>;
    },
  }),
  columnHelper.accessor('spec.givenName', {
    header: 'Full Name',
    cell: ({ row }) => {
      return `${row.original.spec.givenName} ${row.original.spec.familyName}`;
    },
  }),
  columnHelper.accessor('spec.email', {
    header: 'Email',
  }),
];

export default function Page() {
  const tableState = useDataTableQuery<UserResponse>({
    queryKeyPrefix: 'users',
    fetchFn: userQuery,
    useSorting: true,
    useGlobalFilter: true,
  });

  return (
    <DataTableProvider<User, UserResponse>
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
