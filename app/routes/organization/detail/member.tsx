import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/member';
import { BadgeState } from '@/components/badge';
import { DisplayName } from '@/components/display';
import {
  orgInvitationCreateMutation,
  orgInvitationDeleteMutation,
  orgMemberListQuery,
} from '@/resources/request/client';
import { TeamMember, TeamMemberListResponse } from '@/resources/schemas';
import { userRoutes } from '@/utils/config/routes.config';
import { generateMetadataName, metaObject } from '@/utils/helpers';
import { ActionItem, DataTable, DataTableProvider, useDataTableQuery } from '@datum-ui/data-table';
import { toast } from '@datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { addHours, differenceInMinutes, formatRFC3339 } from 'date-fns';
import { CircleXIcon, MailIcon } from 'lucide-react';
import { useState } from 'react';

export const handle = {
  breadcrumb: () => <Trans>Members</Trans>,
};

export const meta: Route.MetaFunction = ({ matches }) => {
  const { organizationName } = getOrganizationDetailMetadata(matches);
  return metaObject(`Members - ${organizationName}`);
};

const columnHelper = createColumnHelper<TeamMember>();
const columns = [
  columnHelper.accessor('givenName', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const userName = row.original.name;
      const displayName = `${row.original.givenName} ${row.original.familyName}`;
      const email = row.original.email;

      return (
        <DisplayName
          displayName={displayName}
          name={email || userName}
          to={userRoutes.detail(userName)}
        />
      );
    },
  }),
  columnHelper.accessor('invitationState', {
    header: () => '',
    cell: ({ getValue }) => <BadgeState state={getValue() ?? ''} />,
  }),
  columnHelper.accessor('roles', {
    header: () => <Trans>Role</Trans>,
    cell: ({ getValue }) => <BadgeState state={getValue()?.[0]?.name ?? ''} />,
  }),
];

export default function Page() {
  const { t } = useLingui();
  const data = useOrganizationDetailData();

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const tableState = useDataTableQuery<TeamMemberListResponse>({
    queryKeyPrefix: ['organizations', data.metadata.name, 'members'],
    fetchFn: (args) => orgMemberListQuery(data.metadata.name, args),
    useSorting: true,
  });

  const actions: ActionItem<TeamMember>[] = [
    {
      label: t`Resend`,
      icon: MailIcon,
      disabled: (row) => row.invitationState !== 'Pending',
      onClick: async (row) => {
        if (row.createdAt) {
          const createdAt = new Date(row.createdAt);
          const now = new Date();
          const minutesSinceCreation = differenceInMinutes(now, createdAt);

          if (minutesSinceCreation < 10) {
            const remainingMinutes = 10 - minutesSinceCreation;
            toast.error(
              t`Please wait ${remainingMinutes} more minute${remainingMinutes !== 1 ? 's' : ''} before resending this invitation`
            );
            return;
          }
        }

        setLoadingStates((prev) => ({ ...prev, [row.name]: true }));
        try {
          await orgInvitationDeleteMutation(data.metadata.name, row.name);
          await orgInvitationCreateMutation(data.metadata.name, {
            apiVersion: 'iam.miloapis.com/v1alpha1',
            kind: 'UserInvitation',
            metadata: {
              generateName: 'user-invitation-',
            },
            spec: {
              email: row.email,
              familyName: row.familyName,
              givenName: row.givenName,
              expirationDate: formatRFC3339(addHours(new Date(), 24)),
              organizationRef: { name: data.metadata.name },
              roles: row.roles,
              state: 'Pending',
            },
          });
          await new Promise((resolve) =>
            setTimeout(() => resolve(tableState.query.refetch()), 1000)
          );
          toast.success(t`Invitation resend successfully`);
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.name]: false }));
        }
      },
    },
    {
      label: t`Cancel`,
      icon: CircleXIcon,
      variant: 'destructive' as const,
      disabled: (row) => row.invitationState !== 'Pending',
      onClick: async (row) => {
        setLoadingStates((prev) => ({ ...prev, [row.name]: true }));
        try {
          await orgInvitationDeleteMutation(data.metadata.name, row.name);
          await new Promise((resolve) =>
            setTimeout(() => resolve(tableState.query.refetch()), 1000)
          );
          toast.success(t`Invitation cancelled successfully`);
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.name]: false }));
        }
      },
    },
  ];

  return (
    <DataTableProvider<TeamMember, TeamMemberListResponse>
      {...tableState}
      columns={columns}
      actions={actions}
      actionsLoading={(row) => loadingStates[row.name] || false}
      transform={(data) => ({
        rows: data?.data || [],
        cursor: undefined,
      })}>
      <div className="m-4 flex flex-col gap-2">
        <DataTable />
      </div>
    </DataTableProvider>
  );
}
