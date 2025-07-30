import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { orgListQuery } from '@/resources/request/client/organization.request';
import { Organization, OrganizationListResponse } from '@/resources/schemas/organization.schema';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Organizations`);
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
    fetchFn: orgListQuery,
    useSorting: true,
  });

  return (
    <DataTableProvider<Organization, OrganizationListResponse>
      {...tableState}
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.items || [],
        cursor: data?.data?.metadata?.continue,
      })}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable />
      </div>
    </DataTableProvider>
  );
}
