import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/index';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { useOrgProjectListQuery } from '@/resources/request/client';
import { projectRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisResourcemanagerV1Alpha1Project } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';

export const handle = {
  breadcrumb: () => <Trans>Projects</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Projects - ${organizationName}`);
};

const columnHelper = createColumnHelper<ComMiloapisResourcemanagerV1Alpha1Project>();

export default function Page() {
  const orgData = useOrganizationDetailData();
  const orgName = orgData.metadata?.name ?? '';

  const tableQuery = useOrgProjectListQuery(orgName);

  const columns = [
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const projectName = row.original.metadata?.name ?? '';
        const description = row.original.metadata?.annotations?.['kubernetes.io/description'] ?? '';
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
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  return (
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={tableQuery.data?.items ?? []}
      columns={columns}
      pageSize={20}
      getRowId={(row) => row.metadata?.name ?? ''}
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const name = (row.metadata?.name ?? '').toLowerCase();
        const desc = (row.metadata?.annotations?.['kubernetes.io/description'] ?? '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              <DataTable.Search placeholder={t`Search projects...`} className="w-full md:w-64" />
            }
          />
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No projects found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
