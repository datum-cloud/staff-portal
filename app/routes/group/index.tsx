import type { Route } from './+types/index';
import { DateFormatter } from '@/components/date';
import { DisplayName } from '@/components/display';
import { groupListQuery } from '@/resources/request/client/group.request';
import { metaObject } from '@/utils/helpers';
import {
  ClientDataTable,
  ClientDataTableProvider,
  ClientDataTableSearch,
  createAdvancedSearch,
  useClientDataTableQuery,
} from '@datum-ui/client-data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisIamV1Alpha1Group,
  ComMiloapisIamV1Alpha1GroupList,
} from '@openapi/iam.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Groups`);
};

const columnHelper = createColumnHelper<ComMiloapisIamV1Alpha1Group>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const groupName = row.original.metadata?.name ?? '';
      const displayName = row.original.metadata?.namespace;

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
  const tableState = useClientDataTableQuery<ComMiloapisIamV1Alpha1GroupList>({
    queryKeyPrefix: 'groups',
    fetchFn: () => groupListQuery(),
    useSorting: true,
    useSearch: true,
  });

  return (
    <ClientDataTableProvider<ComMiloapisIamV1Alpha1Group, ComMiloapisIamV1Alpha1GroupList>
      {...tableState}
      columns={columns}
      transform={(data) => data?.items || []}
      globalFilterFn={createAdvancedSearch<ComMiloapisIamV1Alpha1Group>([
        (row) => row.metadata?.name?.toLowerCase() || '',
        (row) => row.metadata?.namespace?.toLowerCase() || '',
      ])}>
      <div className="m-4 flex flex-col gap-2">
        <ClientDataTableSearch placeholder={t`Search groups...`} />
        <ClientDataTable />
      </div>
    </ClientDataTableProvider>
  );
}
