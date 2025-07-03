import type { Route } from './+types/user';
import AppActionBar from '@/components/app-actiobar';
import { DataTable } from '@/modules/data-table/components/data-table';
import { useDataTableQuery } from '@/modules/data-table/hooks/useDataTableQuery';
import {
  DataTableProvider,
  useDataTableInstance,
} from '@/modules/data-table/providers/data-table.provider';
import { Button } from '@/modules/shadcn/ui/button';
import { Input } from '@/modules/shadcn/ui/input';
import { userQuery } from '@/resources/api/user.resource';
import { User, UserResponse } from '@/resources/schemas/user.schema';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';

export const meta: Route.MetaFunction = () => {
  return metaObject('Users');
};

export const handle = {
  breadcrumb: () => <span>Users</span>,
};

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor('spec.givenName', {
    header: 'Given Name',
  }),
  columnHelper.accessor('spec.familyName', {
    header: 'Family Name',
  }),
  columnHelper.accessor('metadata.uid', {
    header: 'UID',
  }),
  columnHelper.accessor('spec.email', {
    header: 'Email',
  }),
];

export function UsersToolbar() {
  const { table } = useDataTableInstance();

  return (
    <div className="mb-4 flex gap-2">
      <Input
        placeholder="Search by name/email"
        value={table.getState().globalFilter ?? ''}
        onChange={(e) => table.setGlobalFilter(e.target.value)}
        className="w-64"
      />
    </div>
  );
}

export default function CustomerUser() {
  const tableState = useDataTableQuery<UserResponse>({
    queryKeyPrefix: 'users',
    fetchFn: userQuery,
    useSorting: true,
    useGlobalFilter: true,
  });

  return (
    <DataTableProvider<User, UserResponse>
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.items || [],
        cursor: data?.data?.metadata?.continue,
      })}
      {...tableState}>
      <AppActionBar>
        <Button>
          <PlusIcon />
          New
        </Button>
      </AppActionBar>

      <div className="m-4 flex flex-col gap-2">
        <UsersToolbar />
        <DataTable<User> />
      </div>
    </DataTableProvider>
  );
}
