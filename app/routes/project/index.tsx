import type { Route } from './+types/index';
import { DateFormatter } from '@/components/date';
import { DataTable } from '@/modules/data-table/components/data-table';
import { useDataTableQuery } from '@/modules/data-table/hooks/useDataTableQuery';
import { DataTableProvider } from '@/modules/data-table/providers/data-table.provider';
import { projectListQuery } from '@/resources/request/client/project.request';
import { Project, ProjectListResponse } from '@/resources/schemas/project.schema';
import { projectRoutes, orgRoutes } from '@/utils/config/routes.config';
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
  columnHelper.accessor((row) => row.metadata.annotations?.['kubernetes.io/description'], {
    id: 'description',
    header: () => <Trans>Description</Trans>,
    cell: ({ getValue, row }) => {
      return <Link to={`./${row.original.metadata.name}`}>{getValue()}</Link>;
    },
  }),
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
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
