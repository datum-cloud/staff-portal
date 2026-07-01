import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { ListPage, ListTable } from '@/features/milo';
import { type GqlProject, useProjectListQuery } from '@/resources/request/client';
import { orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Projects`);
};

const columnHelper = createColumnHelper<GqlProject>();

export default function Page() {
  const tableQuery = useProjectListQuery();

  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => (
        <DisplayName
          displayName={row.original.displayName || row.original.name}
          name={row.original.name}
          to={`./${row.original.name}`}
        />
      ),
    }),
    columnHelper.accessor('organizationName', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Organization`} />,
      cell: ({ getValue }) => {
        const name = getValue() ?? '';
        return <Link to={orgRoutes.detail(name)}>{name}</Link>;
      },
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue() ?? undefined} />,
    }),
  ];

  return (
    <ListPage>
      <ListTable
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={20}
        getRowId={(row) => row.name}
        defaultSort={[{ id: 'createdAt', desc: true }]}
        searchPlaceholder={t`Search projects...`}
        emptyMessage={t`No projects found.`}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            row.name.toLowerCase().includes(q) ||
            row.displayName.toLowerCase().includes(q) ||
            (row.organizationName ?? '').toLowerCase().includes(q)
          );
        }}
      />
    </ListPage>
  );
}
