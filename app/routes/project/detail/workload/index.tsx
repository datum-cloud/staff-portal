import { getProjectDetailMetadata, useProjectDetailData } from '../../shared';
import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { PageHeader } from '@/components/page-header';
import { authenticator } from '@/modules/auth';
import { useProjectWorkloadListQuery } from '@/resources/request/client';
import { projectWorkloadListQuery } from '@/resources/request/server';
import { toWorkloadList, workloadHealthToBadgeStatus, type Workload } from '@/resources/workloads';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = ({ matches }) => {
  const { projectName } = getProjectDetailMetadata(matches);
  return metaObject(`Workloads - ${projectName}`);
};

export const loader = async ({ params, request }: Route.LoaderArgs) => {
  const session = await authenticator.getSession(request);
  const raw = await projectWorkloadListQuery(
    session?.accessToken ?? '',
    params.projectName ?? ''
  );
  const items = toWorkloadList((raw as any)?.items ?? []).items;
  return { workloads: items };
};

const columnHelper = createColumnHelper<Workload>();

export default function Page() {
  const { project } = useProjectDetailData();
  const projectName = project?.metadata?.name ?? '';
  const tableQuery = useProjectWorkloadListQuery(projectName);

  const workloads = tableQuery.data ?? [];

  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ getValue }) => (
        <Link
          to={projectRoutes.workload.detail(projectName, getValue())}
          className="text-primary hover:underline">
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('image', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Image`} />,
      cell: ({ getValue }) => {
        const image = getValue();
        return image ? (
          <span className="max-w-xs truncate font-mono text-xs">{image}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.accessor('health', {
      header: () => t`Health`,
      cell: ({ getValue }) => {
        const health = getValue();
        return <BadgeState state={workloadHealthToBadgeStatus(health)} message={health} />;
      },
    }),
    columnHelper.display({
      id: 'ready',
      header: () => t`Ready`,
      cell: ({ row }) => `${row.original.currentReplicas}/${row.original.desiredReplicas}`,
    }),
    columnHelper.accessor('placements', {
      header: () => t`Placements`,
      cell: ({ getValue }) => {
        const placements = getValue();
        return placements.length > 0 ? (
          placements.join(', ')
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Age`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  if (!tableQuery.isLoading && workloads.length === 0) {
    return (
      <div className="m-4 flex flex-col gap-4">
        <PageHeader title={t`Workloads`} />
        <p className="text-muted-foreground text-sm">No workloads in this project.</p>
      </div>
    );
  }

  return (
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={workloads}
      columns={columns}
      pageSize={20}
      getRowId={(row) => row.uid}
      defaultSort={[{ id: 'createdAt', desc: true }]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return row.name.toLowerCase().includes(q);
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              <DataTable.Search
                placeholder={t`Search workloads...`}
                className="w-full md:w-64"
              />
            }
          />
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No workloads found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
