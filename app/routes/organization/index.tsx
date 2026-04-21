import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { useOrgListQuery } from '@/resources/request/client';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import type { ComMiloapisResourcemanagerV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Organizations`);
};

const columnHelper = createColumnHelper<ComMiloapisResourcemanagerV1Alpha1Organization>();

export default function Page() {
  const tableQuery = useOrgListQuery();

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const orgName = row.original.metadata?.name ?? '';
        const displayName =
          row.original.metadata?.annotations?.['kubernetes.io/display-name'] ?? '';

        return (
          <DisplayName displayName={displayName || orgName} name={orgName} to={`./${orgName}`} />
        );
      },
    }),
    columnHelper.accessor('spec.type', {
      id: 'type',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Type`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Organization'} />,
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  const items = tableQuery.data?.items ?? [];
  const data = items.map((row) => ({ ...row, type: row.spec?.type }));

  return (
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={data}
      columns={columns}
      pageSize={20}
      getRowId={(row) => row.metadata?.name ?? ''}
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      filterFns={{
        type: (cellValue, filterValue) =>
          String(cellValue ?? '').toLowerCase() === String(filterValue ?? '').toLowerCase(),
      }}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const name = (row.metadata?.name ?? '').toLowerCase();
        const display = (
          row.metadata?.annotations?.['kubernetes.io/display-name'] ?? ''
        ).toLowerCase();
        const type = (row.spec?.type ?? '').toLowerCase();
        return name.includes(q) || display.includes(q) || type.includes(q);
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
