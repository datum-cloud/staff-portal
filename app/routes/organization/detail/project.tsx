import type { Route } from './+types/index';
import DateFormatter from '@/components/date-formatter';
import { DataTable } from '@/modules/data-table/components/data-table';
import { useDataTableQuery } from '@/modules/data-table/hooks/useDataTableQuery';
import { DataTableProvider } from '@/modules/data-table/providers/data-table.provider';
import { orgProjectListQuery } from '@/resources/request/client/organization.request';
import { Organization } from '@/resources/schemas/organization.schema';
import { Project, ProjectListResponse, ProjectResponse } from '@/resources/schemas/project.schema';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link, useRouteLoaderData } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Organization>(matches, 'routes/organization/detail/layout');
  return metaObject(`Projects - ${data?.metadata?.annotations?.['kubernetes.io/display-name']}`);
};

export const handle = {
  breadcrumb: () => <Trans>Projects</Trans>,
};

const columnHelper = createColumnHelper<Project>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ getValue }) => {
      return <Link to={`/projects/${getValue()}`}>{getValue()}</Link>;
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
  const data = useRouteLoaderData('routes/organization/detail/layout') as Organization;

  const tableState = useDataTableQuery<ProjectListResponse>({
    queryKeyPrefix: ['projects', data.metadata.name],
    fetchFn: (params) => orgProjectListQuery(data.metadata.name, params),
    useSorting: true,
    useGlobalFilter: true,
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
