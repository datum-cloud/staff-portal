import { useProjectDetailData, getProjectDetailMetadata } from '../../shared';
import type { Route } from './+types/index';
import { BadgeCondition } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { projectExportPolicyListQuery } from '@/resources/request/client';
import { ExportPolicy, ExportPolicyListResponse } from '@/resources/schemas';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Export Policies - ${projectName}`);
};

const columnHelper = createColumnHelper<ExportPolicy>();

export default function Page() {
  const { project } = useProjectDetailData();

  const tableState = useDataTableQuery<ExportPolicyListResponse>({
    queryKeyPrefix: ['projects', project.metadata.name, 'export-policies'],
    fetchFn: (params) => projectExportPolicyListQuery(project.metadata.name, params),
    useSorting: true,
  });

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: () => <Trans>Name</Trans>,
      cell: ({ getValue }) => (
        <Link to={projectRoutes.exportPolicy.detail(project.metadata.name, getValue())}>
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('spec.sinks', {
      header: () => <Trans># of Sinks</Trans>,
      cell: ({ getValue }) => getValue().length,
    }),
    columnHelper.accessor('spec.sources', {
      header: () => <Trans># of Sources</Trans>,
      cell: ({ getValue }) => getValue().length,
    }),
    columnHelper.accessor('status', {
      header: () => <Trans>Status</Trans>,
      cell: ({ getValue }) => (
        <BadgeCondition status={getValue()} multiple={false} showMessage className="text-xs" />
      ),
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      header: () => <Trans>Created</Trans>,
      cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
    }),
  ];

  return (
    <DataTableProvider<ExportPolicy, ExportPolicyListResponse>
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.items || [],
        cursor: data?.data?.metadata?.continue,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable<ExportPolicy> />
      </div>
    </DataTableProvider>
  );
}
