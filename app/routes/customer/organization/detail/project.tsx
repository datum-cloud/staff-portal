import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { ListTable } from '@/features/milo';
import { type GqlProject, useOrgProjectListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';

export const handle = {
  breadcrumb: () => <Trans>Projects</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Projects - ${organizationName}`);
};

const columnHelper = createColumnHelper<GqlProject>();

export default function Page() {
  const orgData = useOrganizationDetailData();
  const orgName = orgData.metadata?.name ?? '';

  const tableQuery = useOrgProjectListQuery(orgName);

  const columns = [
    columnHelper.accessor('name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => (
        <DisplayName
          displayName={row.original.displayName || row.original.name}
          name={row.original.name}
          to={projectRoutes.detail(row.original.name)}
        />
      ),
    }),
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue() ?? undefined} />,
    }),
  ];

  return (
    <ListTable
      loading={tableQuery.isLoading}
      data={tableQuery.data?.items ?? []}
      columns={columns}
      pageSize={20}
      getRowId={(row) => row.name}
      defaultSort={[{ id: 'createdAt', desc: true }]}
      inset="tab"
      searchPlaceholder={t`Search projects...`}
      emptyMessage={t`No projects found.`}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return row.name.toLowerCase().includes(q) || row.displayName.toLowerCase().includes(q);
      }}
    />
  );
}
