import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import BadgeState from '@/components/badge-state';
import UIDDisplay from '@/components/uid-display';
import { DataTable } from '@/modules/data-table/components/data-table';
import { useDataTableQuery } from '@/modules/data-table/hooks/useDataTableQuery';
import { DataTableProvider } from '@/modules/data-table/providers/data-table.provider';
import { Button } from '@/modules/shadcn/ui/button';
import { orgQuery } from '@/resources/request/client/organization.request';
import { Organization, OrganizationListResponse } from '@/resources/schemas/organization.schema';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Organizations');
};

const columnHelper = createColumnHelper<Organization>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: 'Name',
    cell: ({ getValue }) => {
      return <Link to={`/customers/organizations/${getValue()}`}>{getValue()}</Link>;
    },
  }),
  columnHelper.accessor('metadata.annotations', {
    header: 'Description',
    cell: ({ row }) => {
      return (
        row.original.metadata.annotations?.['kubernetes.io/display-name'] ||
        row.original.metadata.name
      );
    },
  }),
  columnHelper.accessor('metadata.uid', {
    header: 'UID',
    cell: ({ getValue }) => {
      return <UIDDisplay uuid={getValue()} />;
    },
  }),
  columnHelper.accessor('spec.type', {
    header: 'Type',
    cell: ({ getValue }) => {
      return <BadgeState state={getValue()} />;
    },
  }),
];

export default function CustomerOrganization() {
  const tableState = useDataTableQuery<OrganizationListResponse>({
    queryKeyPrefix: 'orgs',
    fetchFn: orgQuery,
    useSorting: true,
    useGlobalFilter: true,
  });

  return (
    <DataTableProvider<Organization, OrganizationListResponse>
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
        <DataTable<Organization> />
      </div>
    </DataTableProvider>
  );
}
