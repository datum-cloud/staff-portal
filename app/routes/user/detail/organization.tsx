import type { Route } from './+types/organization';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName } from '@/components/display';
import { userOrgListQuery } from '@/resources/request/client';
import { getUserDetailMetadata, useUserDetailData } from '@/routes/user/shared';
import { orgRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import {
  ClientDataTable,
  ClientDataTableProvider,
  ClientDataTableSearch,
  createAdvancedSearch,
  useClientDataTableQuery,
} from '@datum-ui/client-data-table';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisResourcemanagerV1Alpha1OrganizationMembership,
  ComMiloapisResourcemanagerV1Alpha1OrganizationMembershipList,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';

const columnHelper = createColumnHelper<ComMiloapisResourcemanagerV1Alpha1OrganizationMembership>();

const columns = [
  columnHelper.accessor('spec.organizationRef.name', {
    header: () => <Trans>Name</Trans>,
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
    header: () => <Trans>Type</Trans>,
    cell: ({ getValue }) => <BadgeState state={getValue() ?? ''} />,
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Joined</Trans>,
    cell: ({ getValue }) => <DateTime date={getValue()} />,
  }),
];

export const handle = {
  breadcrumb: () => <Trans>Organizations</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { userName } = getUserDetailMetadata(matches);
  return metaObject(`Organizations - ${userName}`);
};

export default function Page() {
  const data = useUserDetailData();

  const tableState =
    useClientDataTableQuery<ComMiloapisResourcemanagerV1Alpha1OrganizationMembershipList>({
      queryKeyPrefix: ['users', data.metadata?.name ?? '', 'organizations'],
      fetchFn: () => userOrgListQuery(data.metadata?.name ?? ''),
      useSorting: true,
      useSearch: true,
    });

  return (
    <ClientDataTableProvider<
      ComMiloapisResourcemanagerV1Alpha1OrganizationMembership,
      ComMiloapisResourcemanagerV1Alpha1OrganizationMembershipList
    >
      {...tableState}
      columns={columns}
      transform={(data) => data?.items || []}
      globalFilterFn={createAdvancedSearch<ComMiloapisResourcemanagerV1Alpha1OrganizationMembership>(
        [
          (row) => row.spec?.organizationRef?.name?.toLowerCase() || '',
          (row) => row.status?.organization?.displayName?.toLowerCase() || '',
          (row) => row.status?.organization?.type?.toLowerCase() || '',
        ]
      )}>
      <div className="m-4 flex flex-col gap-2">
        <ClientDataTableSearch placeholder={t`Search organizations...`} />
        <ClientDataTable />
      </div>
    </ClientDataTableProvider>
  );
}
