import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DisplayName } from '@/components/display';
import { orgListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1OrganizationList,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Organizations`);
};

const columnHelper = createColumnHelper<ComMiloapisResourcemanagerV1Alpha1Organization>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const orgName = row.original.metadata?.name ?? '';
      const displayName = row.original.metadata?.annotations?.['kubernetes.io/display-name'] ?? '';

      return (
        <DisplayName displayName={displayName || orgName} name={orgName} to={`./${orgName}`} />
      );
    },
  }),
  columnHelper.accessor('spec.type', {
    header: () => <Trans>Type</Trans>,
    cell: ({ getValue }) => {
      return <BadgeState state={getValue() ?? 'Organization'} />;
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
  }),
];

export default function Page() {
  const tableState = useDataTableQuery<ComMiloapisResourcemanagerV1Alpha1OrganizationList>({
    queryKeyPrefix: 'orgs',
    fetchFn: orgListQuery,
    useSorting: true,
  });

  return (
    <DataTableProvider<
      ComMiloapisResourcemanagerV1Alpha1Organization,
      ComMiloapisResourcemanagerV1Alpha1OrganizationList
    >
      {...tableState}
      columns={columns}
      transform={(data) => ({
        rows: data?.items || [],
        cursor: data?.metadata?.continue,
      })}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable />
      </div>
    </DataTableProvider>
  );
}
