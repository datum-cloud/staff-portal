import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DisplayId, DisplayName } from '@/components/display';
import { ListPage, ListTable, ListColumnHeader } from '@/features/milo';
import { useGroupListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
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
    columnHelper.accessor((row) => row.metadata?.name ?? '', {
      id: 'id',
      header: ({ column }) => <ListColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => <DisplayId value={getValue()} />,
    }),
    columnHelper.accessor(
      (row) =>
        row.metadata?.annotations?.['kubernetes.io/display-name'] || row.metadata?.name || '',
      {
        id: 'name',
        header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
        cell: ({ getValue, row }) => {
          const groupName = row.original.metadata?.name ?? '';
          return <DisplayName displayName={getValue()} to={`./${groupName}`} />;
        },
      }
    ),
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
