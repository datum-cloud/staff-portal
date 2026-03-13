import { getProjectDetailMetadata, useProjectDetailData } from '../shared';
import type { Route } from './+types/secret';
import { metricsCreateMutation } from '@/resources/request/client';
import { Secret } from '@/resources/schemas';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';

export const handle = {
  breadcrumb: () => <Trans>Secrets</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Secret - ${projectName}`);
};

const columnHelper = createColumnHelper<Secret>();

const columns = [
  columnHelper.accessor('metric.resource_name', {
    header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
  }),
  columnHelper.accessor('metric.resource_namespace', {
    header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Namespace`} />,
  }),
  columnHelper.accessor('metric.resource_version', {
    header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Version`} />,
  }),
];

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project?.metadata?.name ?? '';

  const tableQuery = useQuery({
    queryKey: ['projects', projectName, 'secrets', 'metrics'],
    queryFn: () =>
      metricsCreateMutation({
        type: 'instant',
        query: `datum_cloud_core_secret_info{resourcemanager_datumapis_com_project_name="${projectName}"}`,
      }),
    enabled: Boolean(projectName),
    staleTime: 60 * 1000,
  });

  const rows = tableQuery.data?.data?.data?.result ?? [];

  return (
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={rows}
      columns={columns}
      pageSize={20}
      getRowId={(row, i) =>
        `${row.metric.resource_namespace}/${row.metric.resource_name}/${row.metric.resource_version}/${i}`
      }
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [
          row.metric.resource_name,
          row.metric.resource_namespace,
          row.metric.resource_version,
        ]
          .map((v) => v.toLowerCase())
          .some((v) => v.includes(q));
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <div className="flex flex-wrap items-center gap-4">
            <DataTable.Search placeholder={t`Search secrets...`} className="w-64 min-w-[12rem]" />
          </div>
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No secrets found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
