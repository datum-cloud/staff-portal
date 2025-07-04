import type { Route } from './+types/user';
import AppActionBar from '@/components/app-actiobar';
import { DataTable } from '@/modules/data-table/components/data-table';
import { useDataTableQuery } from '@/modules/data-table/hooks/useDataTableQuery';
import { DataTableProvider } from '@/modules/data-table/providers/data-table.provider';
import { Badge } from '@/modules/shadcn/ui/badge';
import { Button } from '@/modules/shadcn/ui/button';
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
  columnHelper.accessor('metadata.annotations', {
    header: 'Name',
    cell: ({ row }) => {
      return (
        row.original.metadata.annotations?.['kubernetes.io/display-name'] ||
        row.original.metadata.name
      );
    },
  }),
  columnHelper.accessor('metadata.name', {
    header: 'Slug',
  }),
  columnHelper.accessor('metadata.uid', {
    header: 'UID',
  }),
  columnHelper.accessor('spec.type', {
    header: 'Type',
    cell: ({ getValue }) => {
      if (!getValue()) {
        return null;
      }

      if (getValue() === 'Personal') {
        return <Badge>{getValue()}</Badge>;
      }

      return <Badge variant="secondary">{getValue()}</Badge>;
    },
  }),
];

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
        <DataTable<Organization> />
      </div>
    </DataTableProvider>
  );
}
