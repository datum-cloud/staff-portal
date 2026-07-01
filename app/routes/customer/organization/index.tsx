import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { ListPage, ListTable } from '@/features/milo';
import { type GqlOrganization, useOrgListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Building2, User } from 'lucide-react';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Organizations`);
};

const columnHelper = createColumnHelper<GqlOrganization>();

export default function Page() {
  const tableQuery = useOrgListQuery();

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
    columnHelper.accessor('type', {
      id: 'type',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Type`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Organization'} />,
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
        searchPlaceholder={t`Search organizations...`}
        emptyMessage={t`No organizations found.`}
        filters={[
          {
            column: 'type',
            label: t`Type`,
            options: [
              { value: 'Personal', label: t`Personal`, icon: <User /> },
              { value: 'Standard', label: t`Standard`, icon: <Building2 /> },
            ],
          },
        ]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            row.name.toLowerCase().includes(q) ||
            row.displayName.toLowerCase().includes(q) ||
            row.type.toLowerCase().includes(q)
          );
        }}
      />
    </ListPage>
  );
}
