import type { Route } from './+types/index';
import { DateFormatter } from '@/components/date';
import { DisplayName } from '@/components/display';
import { groupListQuery } from '@/resources/request/client/group.request';
import { Group, GroupListResponse } from '@/resources/schemas';
import { metaObject } from '@/utils/helpers';
import { DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Groups`);
};

const columnHelper = createColumnHelper<Group>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const groupName = row.original.metadata.name;
      const displayName = row.original.metadata.namespace;

      return (
        <DisplayName
          displayName={groupName}
          name={displayName || groupName}
          to={`./${groupName}`}
        />
      );
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
  }),
];

export default function Page() {
  const tableState = useDataTableQuery<GroupListResponse>({
    queryKeyPrefix: 'groups',
    fetchFn: groupListQuery,
    useSorting: true,
  });

  return (
    <DataTableProvider<Group, GroupListResponse>
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
