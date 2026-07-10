import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import { DATE_RANGE_OPTIONS, ListGrowthChart, ListPage, ListTable } from '@/features/milo';
import { type GqlOrganization, useAllOrganizationsQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Building2, User } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Organizations`);
};

const columnHelper = createColumnHelper<GqlOrganization>();

const getOrgCreatedAt = (org: GqlOrganization) => org.createdAt;

export default function Page() {
  const tableQuery = useAllOrganizationsQuery();
  const orgs = useMemo(() => tableQuery.data?.items ?? [], [tableQuery.data]);

  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => (
        <Link to={`./${row.original.name}`}>{row.original.displayName || row.original.name}</Link>
      ),
    }),
    columnHelper.accessor('name', {
      id: 'id',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => <DisplayId value={getValue() ?? ''} />,
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
        data={orgs}
        columns={columns}
        pageSize={50}
        getRowId={(row) => row.name}
        defaultSort={[{ id: 'createdAt', desc: true }]}
        searchPlaceholder={t`Search organizations...`}
        emptyMessage={t`No organizations found.`}
        hasMore={tableQuery.data?.hasMore ?? false}
        hasMoreMessage={t`Limited to 10,000 organizations. Refine your search to surface others.`}
        toolbar={
          <ListGrowthChart
            items={orgs}
            getCreatedAt={getOrgCreatedAt}
            title={t`Total organizations`}
          />
        }
        filters={[
          {
            column: 'type',
            label: t`Type`,
            options: [
              { value: 'Personal', label: t`Personal`, icon: <User /> },
              { value: 'Standard', label: t`Standard`, icon: <Building2 /> },
            ],
          },
          {
            column: 'createdAt',
            label: t`Created`,
            type: 'dateRange',
            options: DATE_RANGE_OPTIONS,
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
