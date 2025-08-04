import type { Route } from './+types/index';
import { DateFormatter } from '@/components/date';
import { DisplayName } from '@/components/display';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { orgProjectListQuery } from '@/resources/request/client';
import { Organization, Project, ProjectListResponse } from '@/resources/schemas';
import { projectRoutes } from '@/utils/config/routes.config';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { useRouteLoaderData } from 'react-router';

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
    cell: ({ row }) => {
      const projectName = row.original.metadata.name;
      const description = row.original.metadata.annotations?.['kubernetes.io/description'];

      return (
        <DisplayName
          displayName={description || projectName}
          name={projectName}
          to={projectRoutes.detail(projectName)}
        />
      );
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
