import { useOrganizationDetailData, getOrganizationDetailMetadata } from '../shared';
import type { Route } from './+types/index';
import { DateFormatter } from '@/components/date';
import { DisplayName } from '@/components/display';
import { orgProjectListQuery } from '@/resources/request/client';
import { Project, ProjectListResponse } from '@/resources/schemas';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';

export const handle = {
  breadcrumb: () => <Trans>Projects</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Projects - ${organizationName}`);
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
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => {
      return <DateFormatter date={getValue()} withTime />;
    },
  }),
];

export default function Page() {
  const data = useOrganizationDetailData();

  const tableState = useDataTableQuery<ProjectListResponse>({
    queryKeyPrefix: ['organizations', data.metadata.name, 'projects'],
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
