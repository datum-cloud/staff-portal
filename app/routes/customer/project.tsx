import type { Route } from './+types/project';
import AppActionBar from '@/components/app-actiobar';
import UIDDisplay from '@/components/uid-display';
import { DataTable } from '@/modules/data-table/components/data-table';
import { useDataTableQuery } from '@/modules/data-table/hooks/useDataTableQuery';
import { DataTableProvider } from '@/modules/data-table/providers/data-table.provider';
import { Button } from '@/modules/shadcn/ui/button';
import { projectQuery } from '@/resources/request/client/project.request';
import { Project, ProjectResponse } from '@/resources/schemas/project.schema';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Projects');
};

export const handle = {
  breadcrumb: () => <span>Projects</span>,
};

const columnHelper = createColumnHelper<Project>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: 'Name',
    cell: ({ getValue }) => {
      return <Link to={`/customers/projects/${getValue()}`}>{getValue()}</Link>;
    },
  }),
  columnHelper.accessor('spec.ownerRef.name', {
    header: 'Organization',
    cell: ({ getValue }) => {
      return <Link to={`/customers/organizations/${getValue()}`}>{getValue()}</Link>;
    },
  }),
  columnHelper.accessor('metadata.uid', {
    header: 'UID',
    cell: ({ getValue }) => {
      return <UIDDisplay value={getValue()} />;
    },
  }),
];

export default function CustomerProject() {
  const tableState = useDataTableQuery<ProjectResponse>({
    queryKeyPrefix: 'projects',
    fetchFn: projectQuery,
    useSorting: true,
    useGlobalFilter: true,
  });

  return (
    <DataTableProvider<Project, ProjectResponse>
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.items || [],
        cursor: data?.data?.metadata?.continue,
      })}
      {...tableState}>
      <AppActionBar>
        <Button>
          <PlusIcon />
          New
        </Button>
      </AppActionBar>

      <div className="m-4 flex flex-col gap-2">
        <DataTable<Project> />
      </div>
    </DataTableProvider>
  );
}
