import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/member';
import { BadgeState } from '@/components/badge';
import { DisplayName } from '@/components/display';
import { ListTable } from '@/features/milo';
import {
  type GqlOrgMember,
  useOrgInvitationCreateMutation,
  useOrgInvitationDeleteMutation,
  useOrgMemberListQuery,
} from '@/resources/request/client';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t as tCore } from '@lingui/core/macro';
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

const columnHelper = createColumnHelper<GqlOrgMember>();

export default function Page() {
  const { t } = useLingui();
  const data = useOrganizationDetailData();
  const orgName = data.metadata?.name ?? '';
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const createInvitationMutation = useOrgInvitationCreateMutation();
  const deleteInvitationMutation = useOrgInvitationDeleteMutation();

  const tableQuery = useOrgMemberListQuery(orgName);

  const actions: ActionItem<GqlOrgMember>[] = [
    {
      label: t`Resend`,
      icon: <MailIcon className="size-4" />,
      hidden: (row) => row.invitationState !== 'Pending',
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
          await deleteInvitationMutation.mutateAsync({ orgName, name: row.name });
          await createInvitationMutation.mutateAsync({
            orgName,
            payload: {
              email: row.email,
              familyName: row.familyName ?? undefined,
              givenName: row.givenName ?? undefined,
              expirationDate: formatRFC3339(addHours(new Date(), 24)),
              organizationRef: { name: orgName },
              roles: (row.roles ?? []).map((name: string) => ({ name })),
              state: 'Pending',
            },
          });
          toast.success(t`Invitation resend successfully`);
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.name]: false }));
        }
      },
    },
    {
      label: t`Cancel`,
      icon: <CircleXIcon className="size-4" />,
      variant: 'destructive' as const,
      hidden: (row) => row.invitationState !== 'Pending',
      onClick: async (row) => {
        setLoadingStates((prev) => ({ ...prev, [row.name]: true }));
        try {
          await deleteInvitationMutation.mutateAsync({ orgName, name: row.name });
          toast.success(t`Invitation cancelled successfully`);
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.name]: false }));
        }
      },
    },
  ];

  const columns = [
    columnHelper.accessor('givenName', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={tCore`Name`} />,
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
      enableSorting: false,
    }),
    columnHelper.accessor('roles', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={tCore`Role`} />,
      cell: ({ getValue }) => <BadgeState state={getValue()?.[0] ?? ''} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right" />,
      cell: ({ row }) => (
        <div className="flex w-full justify-end">
          <DataTable.RowActions
            isLoading={loadingStates[row.original.name]}
            row={row}
            actions={actions}
          />
        </div>
      ),
    }),
  ];

  const members = tableQuery.data ?? [];

  return (
    <ListTable
      loading={tableQuery.isLoading}
      data={members}
      columns={columns}
      pageSize={20}
      getRowId={(row) => row.name}
      defaultSort={[]}
      searchPlaceholder={tCore`Search members...`}
      emptyMessage={tCore`No members found.`}
      filterLayout="inline"
      inset="tab"
      filters={[
        {
          column: 'invitationState',
          label: tCore`Invitation`,
          options: [
            { value: 'Pending', label: <BadgeState state="Pending" /> },
            { value: 'Accepted', label: <BadgeState state="Accepted" /> },
          ],
        },
        {
          column: 'roles',
          label: tCore`Role`,
          options: [
            { value: 'admin', label: tCore`Admin` },
            { value: 'member', label: tCore`Member` },
          ],
        },
      ]}
      filterFns={{
        // `roles` is an array; a row matches if it holds any selected role.
        roles: (cellValue, filterValue) => {
          const roles = cellValue as string[] | undefined;
          const selected = filterValue as string[] | undefined;
          if (!selected?.length) return true;
          return roles?.some((r) => selected.includes(r)) ?? false;
        },
      }}
      searchFn={(row, search) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [
          row.name,
          row.givenName,
          row.familyName,
          row.email,
          `${row.givenName || ''} ${row.familyName || ''}`.trim(),
        ]
          .map((s) => (s ?? '').toLowerCase())
          .some((s) => s.includes(q));
      }}
    />
  );
}
