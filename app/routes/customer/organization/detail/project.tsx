import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/index';
import { DateTime } from '@/components/date';
import { DisplayId } from '@/components/display';
import { ListColumnHeader, ListTable } from '@/features/milo';
import { type GqlProject, useOrgProjectListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router';

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
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue() ?? undefined} />,
    }),
  ];

  return (
    <ListTable
      loading={tableQuery.isLoading}
      data={tableQuery.data?.items ?? []}
      columns={columns}
      pageSize={50}
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
