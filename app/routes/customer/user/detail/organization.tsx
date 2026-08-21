import type { Route } from './+types/organization';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { ListColumnHeader, ListTable } from '@/features/milo';
import { useUserOrganizationListQuery } from '@/resources/request/client';
import { getUserDetailMetadata, useUserDetailData } from '@/routes/customer/user/shared';
import { orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisResourcemanagerV1Alpha1OrganizationMembership } from '@openapi/resourcemanager.miloapis.com/v1alpha1';

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
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
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
      header: ({ column }) => <ListColumnHeader column={column} title={t`Type`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? ''} />,
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Joined`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
  ];

  const rows = tableQuery.data?.items ?? [];

  return (
    <ListTable
      loading={tableQuery.isLoading}
      data={rows}
      columns={columns}
      pageSize={50}
      getRowId={(row) => `${row.metadata?.namespace ?? ''}/${row.metadata?.name ?? ''}`}
      defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
      searchPlaceholder={t`Search organizations...`}
      emptyMessage={t`No organizations found.`}
      inset="tab"
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const name = (row.spec?.organizationRef?.name ?? '').toLowerCase();
        const display = (row.status?.organization?.displayName ?? '').toLowerCase();
        const type = (row.status?.organization?.type ?? '').toLowerCase();
        return name.includes(q) || display.includes(q) || type.includes(q);
      }}
    />
  );
}
