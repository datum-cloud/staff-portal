import type { Route } from './+types/organization';
import { BadgeState } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { useUserOrganizationListQuery } from '@/resources/request/client';
import { getUserDetailMetadata, useUserDetailData } from '@/routes/user/shared';
import { orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisResourcemanagerV1Alpha1OrganizationMembership } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';

const columnHelper = createColumnHelper<ComMiloapisResourcemanagerV1Alpha1OrganizationMembership>();

export const handle = {
  breadcrumb: () => <Trans>Organizations</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { userName } = getUserDetailMetadata(matches);
  return metaObject(`Organizations - ${userName}`);
};

export default function Page() {
  const data = useUserDetailData();
  const userId = data.metadata?.name ?? '';

  const tableQuery = useUserOrganizationListQuery(userId);

  const columns = [
    columnHelper.accessor('spec.organizationRef.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const orgName = row.original.spec?.organizationRef?.name ?? '';
        const displayName = row.original.status?.organization?.displayName;
        return (
          <DisplayName
            displayName={displayName || orgName}
            name={orgName}
            to={orgRoutes.detail(orgName)}
          />
        );
      },
    }),
    columnHelper.accessor('status.organization.type', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Type`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? ''} />,
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Joined`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  const rows = tableQuery.data?.items ?? [];

  return (
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={rows}
      columns={columns}
      pageSize={20}
      getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const name = (row.spec?.organizationRef?.name ?? '').toLowerCase();
        const display = (row.status?.organization?.displayName ?? '').toLowerCase();
        const type = (row.status?.organization?.type ?? '').toLowerCase();
        return name.includes(q) || display.includes(q) || type.includes(q);
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              <DataTable.Search
                placeholder={t`Search organizations...`}
                className="w-full md:w-64"
              />
            }
          />
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={t`No organizations found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
