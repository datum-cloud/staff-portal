import { getProjectDetailMetadata, useProjectDetailData } from '../shared';
import type { Route } from './+types/secret';
import { metricsCreateMutation } from '@/resources/request/client';
import { Secret, SecretListResponse } from '@/resources/schemas';
import { metaObject } from '@/utils/helpers';
import { DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { Trans } from '@lingui/react/macro';
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
    header: () => <Trans>Name</Trans>,
  }),
  columnHelper.accessor('metric.resource_namespace', {
    header: () => <Trans>Namespace</Trans>,
  }),
  columnHelper.accessor('metric.resource_version', {
    header: () => <Trans>Version</Trans>,
  }),
];

export default function Page() {
  const { project } = useProjectDetailData();

  const tableState = useDataTableQuery<SecretListResponse>({
    queryKeyPrefix: ['projects', project.metadata.name, 'secrets'],
    fetchFn: () =>
      metricsCreateMutation({
        type: 'instant',
        query: `datum_cloud_core_secret_info{resourcemanager_datumapis_com_project_name="${project.metadata.name}"}`,
      }),
    useSorting: true,
  });

  return (
    <DataTableProvider<Secret, SecretListResponse>
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.data?.result || [],
        cursor: undefined,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable<Secret> />
      </div>
    </DataTableProvider>
  );
}
