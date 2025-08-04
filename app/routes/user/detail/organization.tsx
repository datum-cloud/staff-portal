import type { Route } from './+types/organization';
import { BadgeState } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DisplayName } from '@/components/display';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { userOrgListQuery } from '@/resources/request/client';
import { User, Member, MemberListResponse } from '@/resources/schemas';
import { orgRoutes } from '@/utils/config/routes.config';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { useRouteLoaderData } from 'react-router';

const columnHelper = createColumnHelper<Member>();

const columns = [
  columnHelper.accessor('spec.organizationRef.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const orgName = row.original.spec.organizationRef.name;
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
    cell: ({ getValue }) => <BadgeState state={getValue()} />,
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Joined</Trans>,
    cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
  }),
];

export const handle = {
  breadcrumb: () => <Trans>Organizations</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<User>(matches, 'routes/user/detail/layout');
  return metaObject(`Organizations - ${data?.spec?.givenName} ${data?.spec?.familyName}`);
};

export default function Page() {
  const data = useRouteLoaderData('routes/user/detail/layout') as User;

  const tableState = useDataTableQuery<MemberListResponse>({
    queryKeyPrefix: ['users', data.metadata.name, 'organizations'],
    fetchFn: (args) => userOrgListQuery(data.metadata.name, args),
    useSorting: true,
  });

  return (
    <DataTableProvider<Member, MemberListResponse>
      {...tableState}
      columns={columns}
      transform={(data) => ({
        rows: data?.data?.items || [],
        cursor: data?.data?.metadata?.continue,
      })}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable />
      </div>
    </DataTableProvider>
  );
}
