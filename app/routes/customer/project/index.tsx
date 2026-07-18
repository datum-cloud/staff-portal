import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import {
  DATE_RANGE_OPTIONS,
  ListGrowthChart,
  ListPage,
  ListTable,
  ListColumnHeader,
} from '@/features/milo';
import { type GqlProject, useAllProjectsQuery } from '@/resources/request/client';
import { orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Link } from 'react-router';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Projects`);
};

const columnHelper = createColumnHelper<GqlProject>();

const getProjectCreatedAt = (project: GqlProject) => project.createdAt;

export default function Page() {
  const tableQuery = useAllProjectsQuery();
  const projects = useMemo(() => tableQuery.data?.items ?? [], [tableQuery.data]);

  // Backend gives no fixed org list here — offer whatever orgs actually show up.
  const organizationOptions = useMemo(() => {
    const names = new Set(projects.map((p) => p.organizationName).filter((v): v is string => !!v));
    return Array.from(names)
      .sort()
      .map((value) => ({ value, label: value }));
  }, [projects]);

  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => (
        <Link to={`./${row.original.name}`}>{row.original.displayName || row.original.name}</Link>
      ),
    }),
    columnHelper.accessor('name', {
      id: 'id',
      header: ({ column }) => <ListColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => <DisplayId value={getValue() ?? ''} />,
    }),
    columnHelper.accessor('organizationName', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Organization`} />,
      cell: ({ getValue }) => {
        const name = getValue() ?? '';
        return <Link to={orgRoutes.detail(name)}>{name}</Link>;
      },
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue() ?? undefined} />,
    }),
  ];

  return (
    <ListPage>
      <ListTable
        loading={tableQuery.isLoading}
        data={projects}
        columns={columns}
        pageSize={50}
        getRowId={(row) => row.name}
        defaultSort={[{ id: 'createdAt', desc: true }]}
        searchPlaceholder={t`Search projects...`}
        emptyMessage={t`No projects found.`}
        hasMore={tableQuery.data?.hasMore ?? false}
        hasMoreMessage={t`Limited to 10,000 projects. Refine your search to surface others.`}
        toolbar={
          <ListGrowthChart
            items={projects}
            getCreatedAt={getProjectCreatedAt}
            title={t`Total projects`}
          />
        }
        filters={[
          { column: 'organizationName', label: t`Organization`, options: organizationOptions },
          {
            column: 'createdAt',
            label: t`Created`,
            type: 'dateRange' as const,
            options: DATE_RANGE_OPTIONS,
          },
        ]}
        searchFn={(row, search) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            row.name.toLowerCase().includes(q) ||
            row.displayName.toLowerCase().includes(q) ||
            (row.organizationName ?? '').toLowerCase().includes(q)
          );
        }}
      />
    </ListPage>
  );
}
