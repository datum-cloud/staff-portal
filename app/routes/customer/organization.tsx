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
import { orgQuery } from '@/resources/api/organization.resource';
import { Organization, OrganizationResponse } from '@/resources/schemas/org.schema';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';

export const meta: Route.MetaFunction = () => {
  return metaObject('Organizations');
};

export const handle = {
  breadcrumb: () => <span>Organizations</span>,
};

const columnHelper = createColumnHelper<Organization>();

const columns = [
  columnHelper.accessor('metadata.name', {
    header: 'Name',
  }),
  columnHelper.accessor('metadata.uid', {
    header: 'UID',
  }),
  columnHelper.accessor('spec.type', {
    header: 'Type',
  }),
];

export function OrganizationsToolbar() {
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

export default function CustomerOrganization() {
  const tableState = useDataTableQuery<OrganizationResponse>({
    queryKeyPrefix: 'orgs',
    fetchFn: orgQuery,
    useSorting: true,
    useGlobalFilter: true,
  });

  return (
    <DataTableProvider<Organization, OrganizationResponse>
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
        <OrganizationsToolbar />
        <DataTable<Organization> />
      </div>
    </DataTableProvider>
  );
}
