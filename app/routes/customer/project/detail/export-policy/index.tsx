import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import { BadgeCondition } from '@/components/badge';
import { DateTime } from '@/components/date';
import { ListColumnHeader, ListTable } from '@/features/milo';
import { useProjectExportPolicyListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { t } from '@lingui/core/macro';
import { ComMiloapisTelemetryV1Alpha1ExportPolicy } from '@openapi/telemetry.miloapis.com/v1alpha1';
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
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ getValue }) => (
        <Link to={projectRoutes.exportPolicy.detail(projectName, getValue() ?? '')}>
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('spec.sinks', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`# of Sinks`} />,
      cell: ({ getValue }) => getValue().length,
    }),
    columnHelper.accessor('spec.sources', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`# of Sources`} />,
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
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <ListTable
      loading={tableQuery.isLoading}
      data={tableQuery.data?.items ?? []}
      columns={columns}
      pageSize={50}
      getRowId={(row) => row.metadata?.name ?? ''}
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      searchPlaceholder={t`Search export policies...`}
      emptyMessage={t`No export policies found.`}
      inset="tab"
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (row.metadata?.name ?? '').toLowerCase().includes(q);
      }}
    />
  );
}
