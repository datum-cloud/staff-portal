import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import { ListColumnHeader, ListTable } from '@/features/milo';
import { ProjectDeletingFor, ProjectPhaseBadge, projectPhaseFilter } from '@/features/project';
import { type ProjectPhase, withProjectPhase } from '@/features/project/lib/project-phase';
import {
  type GqlProject,
  useAllProjectSuspensionsQuery,
  useOrgProjectListQuery,
} from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useMemo } from 'react';
import { Link } from 'react-router';

export const handle = {
  breadcrumb: () => <Trans>Projects</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Projects - ${organizationName}`);
};

type ProjectListRow = GqlProject & { phase: ProjectPhase };

const columnHelper = createColumnHelper<ProjectListRow>();

export default function Page() {
  const orgData = useOrganizationDetailData();
  const orgName = orgData.metadata?.name ?? '';

  const tableQuery = useOrgProjectListQuery(orgName);

  // Suspension lives on a separate resource; join by project name so a suspended
  // project surfaces as a `Suspended` status here too.
  const suspensionsQuery = useAllProjectSuspensionsQuery();
  const suspendedProjectNames = useMemo(() => {
    const set = new Set<string>();
    for (const suspension of suspensionsQuery.data ?? []) {
      const name = suspension.spec?.projectRef?.name;
      if (name) set.add(name);
    }
    return set;
  }, [suspensionsQuery.data]);

  const projects = useMemo(
    () =>
      (tableQuery.data?.items ?? []).map((project) =>
        withProjectPhase(project, { suspended: suspendedProjectNames.has(project.name) })
      ),
    [tableQuery.data, suspendedProjectNames]
  );

  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => (
        <Link to={projectRoutes.detail(row.original.name)}>
          {row.original.displayName || row.original.name}
        </Link>
      ),
    }),
    columnHelper.accessor('name', {
      id: 'id',
      header: ({ column }) => <ListColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => <DisplayId value={getValue() ?? ''} />,
    }),
    columnHelper.accessor('phase', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Status`} />,
      cell: ({ getValue }) => <ProjectPhaseBadge phase={getValue()} />,
    }),
    columnHelper.accessor('deletionTimestamp', {
      id: 'deletingFor',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Deleting for`} />,
      cell: ({ getValue }) => <ProjectDeletingFor deletionTimestamp={getValue()} />,
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue() ?? undefined} />,
    }),
  ];

  return (
    <ListTable
      loading={tableQuery.isLoading}
      data={projects}
      columns={columns}
      pageSize={50}
      getRowId={(row) => row.name}
      defaultSort={[{ id: 'createdAt', desc: true }]}
      inset="tab"
      searchPlaceholder={t`Search projects...`}
      emptyMessage={t`No projects found.`}
      filters={[projectPhaseFilter(t`Status`)]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return row.name.toLowerCase().includes(q) || row.displayName.toLowerCase().includes(q);
      }}
    />
  );
}
