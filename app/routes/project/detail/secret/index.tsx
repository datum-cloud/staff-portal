import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import { DateFormatter } from '@/components/date';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { projectSecretListQuery } from '@/resources/request/client';
import { Secret, SecretListResponse } from '@/resources/schemas';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Secret - ${projectName}`);
};

const columnHelper = createColumnHelper<Secret>();

export default function Page() {
  const { project } = useProjectDetailData();

  const tableState = useDataTableQuery<SecretListResponse>({
    queryKeyPrefix: ['projects', project.metadata.name, 'secrets'],
    fetchFn: (params) => projectSecretListQuery(project.metadata.name, params),
    useSorting: true,
  });

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: () => <Trans>Name</Trans>,
      cell: ({ getValue }) => (
        <Link to={projectRoutes.secret.detail(project.metadata.name, getValue())}>
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('type', {
      header: () => <Trans>Type</Trans>,
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      header: () => <Trans>Created</Trans>,
      cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
    }),
  ];

  return (
    <DataTableProvider<Secret, SecretListResponse>
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.items || [],
        cursor: data?.data?.metadata?.continue,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable<Secret> />
      </div>
    </DataTableProvider>
  );
}
