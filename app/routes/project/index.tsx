import type { Route } from './+types/index';
import { DateFormatter } from '@/components/date';
import { DisplayName } from '@/components/display';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { projectListQuery } from '@/resources/request/client';
import { Project, ProjectListResponse } from '@/resources/schemas';
import { orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Projects`);
};

const columnHelper = createColumnHelper<Project>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const projectName = row.original.metadata.name;
      const description = row.original.metadata.annotations?.['kubernetes.io/description'];

      return (
        <DisplayName
          displayName={description || projectName}
          name={projectName}
          to={`./${projectName}`}
        />
      );
    },
  }),
  columnHelper.accessor('spec.ownerRef.name', {
    header: () => <Trans>Organization</Trans>,
    cell: ({ getValue }) => {
      return <Link to={orgRoutes.detail(getValue())}>{getValue()}</Link>;
    },
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created at</Trans>,
    cell: ({ getValue }) => {
      return <DateFormatter date={getValue()} withTime />;
    },
  }),
];

export default function Page() {
  const tableState = useDataTableQuery<ProjectListResponse>({
    queryKeyPrefix: 'projects',
    fetchFn: projectListQuery,
    useSorting: true,
  });

  return (
    <DataTableProvider<Project, ProjectListResponse>
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.items || [],
        cursor: data?.data?.metadata?.continue,
      })}
      {...tableState}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable<Project> />
      </div>
    </DataTableProvider>
  );
}
