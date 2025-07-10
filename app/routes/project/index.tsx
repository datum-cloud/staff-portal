import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import IDDisplay from '@/components/id-display';
import { DataTable } from '@/modules/data-table/components/data-table';
import { useDataTableQuery } from '@/modules/data-table/hooks/useDataTableQuery';
import { DataTableProvider } from '@/modules/data-table/providers/data-table.provider';
import { Button } from '@/modules/shadcn/ui/button';
import { projectQuery } from '@/resources/request/client/project.request';
import { Project, ProjectResponse } from '@/resources/schemas/project.schema';
import { metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject('Projects');
};

const columnHelper = createColumnHelper<Project>();
const columns = [
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ getValue }) => {
      return <Link to={`./${getValue()}`}>{getValue()}</Link>;
    },
  }),
  columnHelper.accessor('spec.ownerRef.name', {
    header: () => <Trans>Organization</Trans>,
    cell: ({ getValue }) => {
      return <Link to={`/organizations/${getValue()}`}>{getValue()}</Link>;
    },
  }),
];

export default function Page() {
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
          <Trans>New</Trans>
        </Button>
      </AppActionBar>

      <div className="m-4 flex flex-col gap-2">
        <DataTable<Project> />
      </div>
    </DataTableProvider>
  );
}
