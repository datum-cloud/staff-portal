import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import BadgeState from '@/components/badge-state';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { Button } from '@/modules/shadcn/ui/button';
import { orgQuery } from '@/resources/request/client/organization.request';
import { Organization, OrganizationListResponse } from '@/resources/schemas/organization.schema';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Organizations');
};

const columnHelper = createColumnHelper<Organization>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ getValue }) => {
      return <Link to={`./${getValue()}`}>{getValue()}</Link>;
    },
  }),
  columnHelper.accessor('metadata.annotations', {
    header: () => <Trans>Description</Trans>,
    cell: ({ row }) => {
      return (
        row.original.metadata.annotations?.['kubernetes.io/display-name'] ||
        row.original.metadata.name
      );
    },
  }),
  columnHelper.accessor('spec.type', {
    header: () => <Trans>Type</Trans>,
    cell: ({ getValue }) => {
      return <BadgeState state={getValue() ?? 'Organization'} />;
    },
  }),
];

export default function Page() {
  const tableState = useDataTableQuery<OrganizationListResponse>({
    queryKeyPrefix: 'orgs',
    fetchFn: orgQuery,
    useSorting: true,
    useGlobalFilter: true,
  });

  return (
    <DataTableProvider<Organization, OrganizationListResponse>
      {...tableState}
      columns={columns}
      selectable
      transform={(data) => ({
        rows: data?.data?.items || [],
        cursor: data?.data?.metadata?.continue,
      })}>
      {({ table }) => (
        <>
          <AppActionBar>
            <div className="flex items-center gap-2">
              {table.getFilteredSelectedRowModel().rows.length > 0 && (
                <>
                  <span className="text-muted-foreground text-sm">
                    {table.getFilteredSelectedRowModel().rows.length} item
                    {table.getFilteredSelectedRowModel().rows.length === 1 ? '' : 's'} selected
                  </span>
                  <Button variant="destructive" size="sm">
                    <Trash2Icon className="h-4 w-4" />
                    <Trans>Delete Selected</Trans>
                  </Button>
                </>
              )}
              <Button>
                <PlusIcon />
                <Trans>New</Trans>
              </Button>
            </div>
          </AppActionBar>

          <div className="m-4 flex flex-col gap-2">
            <DataTable />
          </div>
        </>
      )}
    </DataTableProvider>
  );
}
