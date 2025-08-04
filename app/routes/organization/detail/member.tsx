import type { Route } from './+types/member';
import { BadgeState } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DisplayName } from '@/components/display';
import { DataTable, DataTableProvider, useDataTableQuery } from '@/modules/data-table';
import { orgMemberListQuery } from '@/resources/request/client';
import { Organization, Member, MemberListResponse } from '@/resources/schemas';
import { userRoutes } from '@/utils/config/routes.config';
import { extractDataFromMatches, metaObject } from '@/utils/helpers';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { useRouteLoaderData } from 'react-router';

const columnHelper = createColumnHelper<Member>();

const columns = [
  columnHelper.accessor('spec.userRef.name', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const userName = row.original.spec.userRef.name;
      const user = row.original.status?.user;
      const displayName = user ? `${user.givenName} ${user.familyName}` : userName;
      const email = user?.email;

      return (
        <DisplayName
          displayName={displayName}
          name={email || userName}
          to={userRoutes.detail(userName)}
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
  breadcrumb: () => <Trans>Members</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = extractDataFromMatches<Organization>(matches, 'routes/organization/detail/layout');
  return metaObject(
    `Members - ${data?.metadata?.annotations?.['kubernetes.io/display-name'] || data?.metadata?.name}`
  );
};

export default function Page() {
  const data = useRouteLoaderData('routes/organization/detail/layout') as Organization;

  const tableState = useDataTableQuery<MemberListResponse>({
    queryKeyPrefix: ['organizations', data.metadata.name, 'members'],
    fetchFn: (args) => orgMemberListQuery(data.metadata.name, args),
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
