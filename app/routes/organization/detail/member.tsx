import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/member';
import { BadgeState } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DisplayName } from '@/components/display';
import {
  useOrgInvitationCreateMutation,
  useOrgInvitationDeleteMutation,
  useOrgMemberListQuery,
} from '@/resources/request/client';
import { TeamMember } from '@/resources/schemas';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
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

const columnHelper = createColumnHelper<TeamMember>();

export default function Page() {
  const { t } = useLingui();
  const data = useOrganizationDetailData();
  const orgName = data.metadata?.name ?? '';
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const createInvitationMutation = useOrgInvitationCreateMutation();
  const deleteInvitationMutation = useOrgInvitationDeleteMutation();

  const tableQuery = useOrgMemberListQuery(orgName);

  const actions: ActionItem<TeamMember>[] = [
    {
      label: t`Resend`,
      icon: MailIcon,
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
              familyName: row.familyName,
              givenName: row.givenName,
              expirationDate: formatRFC3339(addHours(new Date(), 24)),
              organizationRef: { name: orgName },
              roles: row?.roles ?? [],
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
      icon: CircleXIcon,
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
      cell: ({ getValue }) => <BadgeState state={getValue()?.[0]?.name ?? ''} />,
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
    <DataTable.Client
      loading={tableQuery.isLoading}
      data={members}
      columns={columns}
      pageSize={20}
      getRowId={(row) => row.name}
      defaultSort={[]}
      filterFns={{
        invitationState: (cellValue, filterValue) =>
          String(cellValue ?? '').toLowerCase() === String(filterValue ?? '').toLowerCase(),
        roles: (cellValue, filterValue) => {
          const roles = cellValue as Array<{ name?: string }> | undefined;
          return roles?.some((r) => r.name === filterValue) ?? false;
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
      }}>
      <Card className="m-4 py-4 shadow-none">
        <CardContent className="flex flex-col gap-2 px-4">
          <DataTableToolbar
            search={
              <DataTable.Search placeholder={tCore`Search members...`} className="w-full md:w-64" />
            }
            filters={
              <>
                <DataTable.SelectFilter
                  column="invitationState"
                  label={tCore`Invitation`}
                  placeholder={tCore`Filter by invitation`}
                  options={[
                    { value: 'Pending', label: tCore`Pending` },
                    { value: 'Accepted', label: tCore`Accepted` },
                  ]}
                />
                <DataTable.SelectFilter
                  column="roles"
                  label={tCore`Role`}
                  placeholder={tCore`Filter by role`}
                  options={[
                    { value: 'admin', label: tCore`Admin` },
                    { value: 'member', label: tCore`Member` },
                  ]}
                />
              </>
            }
          />
          <DataTable.ActiveFilters
            excludeFilters={['search']}
            filterLabels={{
              invitationState: tCore`Invitation`,
              roles: tCore`Role`,
            }}
          />
          <DataTable.Content
            headerClassName="bg-muted/50"
            className="border-t border-b border-solid"
            emptyMessage={tCore`No members found.`}
          />
          <DataTable.Pagination className="pb-0" />
        </CardContent>
      </Card>
    </DataTable.Client>
  );
}
