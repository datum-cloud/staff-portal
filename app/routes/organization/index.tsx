import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { type GqlOrganization, useOrgListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { createColumnHelper } from '@tanstack/react-table';

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
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={tableQuery.data?.items ?? []}
      columns={columns}
      pageSize={20}
      getRowId={(row) => row.name}
      defaultSort={[{ id: 'createdAt', desc: true }]}
      filterFns={{
        type: (cellValue, filterValue) =>
          String(cellValue ?? '').toLowerCase() === String(filterValue ?? '').toLowerCase(),
      }}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          row.displayName.toLowerCase().includes(q) ||
          row.type.toLowerCase().includes(q)
        );
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              <DataTable.Search
                placeholder={t`Search organizations...`}
                className="w-full md:w-64"
              />
            }
            filters={
              <DataTable.SelectFilter
                column="type"
                label={t`Organization Type`}
                placeholder={t`Filter by type`}
                options={[
                  { value: 'Personal', label: t`Personal` },
                  { value: 'Standard', label: t`Standard` },
                ]}
              />
            }
          />

          <DataTable.ActiveFilters
            excludeFilters={['search']}
            filterLabels={{ type: t`Organization Type` }}
            formatFilterValue={{
              type: (value: string) => {
                const labels: Record<string, string> = {
                  Personal: t`Personal`,
                  Standard: t`Standard`,
                };
                return labels[value] ?? String(value);
              },
            }}
          />

          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No organizations found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
