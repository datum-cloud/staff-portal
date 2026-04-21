import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import { BadgeCondition } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { useProjectExportPolicyListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { ComMiloapisTelemetryV1Alpha1ExportPolicy } from '@openapi/telemetry.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Export Policies - ${projectName}`);
};

const columnHelper = createColumnHelper<ComMiloapisTelemetryV1Alpha1ExportPolicy>();

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project.metadata?.name ?? '';
  const tableQuery = useProjectExportPolicyListQuery(projectName);

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ getValue }) => (
        <Link to={projectRoutes.exportPolicy.detail(projectName, getValue() ?? '')}>
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('spec.sinks', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`# of Sinks`} />,
      cell: ({ getValue }) => getValue().length,
    }),
    columnHelper.accessor('spec.sources', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`# of Sources`} />,
      cell: ({ getValue }) => getValue().length,
    }),
    columnHelper.accessor('status', {
      header: () => t`Status`,
      cell: ({ getValue }) => (
        <BadgeCondition status={getValue()} multiple={false} showMessage className="text-xs" />
      ),
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={tableQuery.data?.items ?? []}
      columns={columns}
      pageSize={20}
      getRowId={(row) => row.metadata?.name ?? ''}
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (row.metadata?.name ?? '').toLowerCase().includes(q);
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              <DataTable.Search
                placeholder={t`Search export policies...`}
                className="w-full md:w-64"
              />
            }
          />
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No export policies found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
