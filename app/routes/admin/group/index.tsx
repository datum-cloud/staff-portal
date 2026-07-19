import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { ListPage, ListTable, ListColumnHeader } from '@/features/milo';
import { useGroupListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { ComMiloapisIamV1Alpha1Group } from '@openapi/iam.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Groups`);
};

const columnHelper = createColumnHelper<ComMiloapisIamV1Alpha1Group>();

export default function Page() {
  const tableQuery = useGroupListQuery();

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const groupName = row.original.metadata?.name ?? '';
        const displayName =
          row.original.metadata?.annotations?.['kubernetes.io/display-name'] || groupName;

        return <DisplayName displayName={displayName} name={groupName} to={`./${groupName}`} />;
      },
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <ListPage>
      <ListTable
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={50}
        getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        searchPlaceholder={t`Search groups...`}
        emptyMessage={t`No groups found.`}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          const name = (row.metadata?.name ?? '').toLowerCase();
          const displayName = (
            row.metadata?.annotations?.['kubernetes.io/display-name'] ?? ''
          ).toLowerCase();
          return name.includes(q) || displayName.includes(q);
        }}
      />
    </ListPage>
  );
}
