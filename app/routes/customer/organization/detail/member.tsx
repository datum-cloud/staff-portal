import { getOrganizationDetailMetadata, useOrganizationDetailData } from '../shared';
import type { Route } from './+types/member';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DisplayName, DisplayText } from '@/components/display';
import { ListColumnHeader, ListTable } from '@/features/milo';
import type { GqlOrgMember } from '@/resources/gql/organization.gql';
import {
  useOrgInvitationDeleteMutation,
  useOrgInvitationResendMutation,
  useOrgMemberListQuery,
} from '@/resources/request/client';
import { STATUS_ICONS } from '@/utils/config/icons.config';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t as tCore } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { isAxiosError } from 'axios';
import { differenceInMinutes } from 'date-fns';
import { MailIcon } from 'lucide-react';
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
  const resendInvitationMutation = useOrgInvitationResendMutation();
  const deleteInvitationMutation = useOrgInvitationDeleteMutation();

  // The API client already toasts a failed request, so only other errors need one here.
  const reportError = (err: unknown, fallback: string) => {
    if (!isAxiosError(err)) {
      toast.error(err instanceof Error ? err.message : fallback);
    }
  };

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
          await resendInvitationMutation.mutateAsync({ orgName, name: row.name });
          toast.success(t`Invitation resend successfully`);
        } catch (err) {
          reportError(err, t`Failed to resend invitation`);
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.name]: false }));
        }
      },
    },
    {
      label: t`Cancel`,
      icon: <STATUS_ICONS.error className="size-4" />,
      variant: 'destructive' as const,
      hidden: (row) => row.invitationState !== 'Pending',
      onClick: async (row) => {
        setLoadingStates((prev) => ({ ...prev, [row.name]: true }));
        try {
          await deleteInvitationMutation.mutateAsync({ orgName, name: row.name });
          toast.success(t`Invitation cancelled successfully`);
        } catch (err) {
          reportError(err, t`Failed to cancel invitation`);
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.name]: false }));
        }
      },
    },
  ];

  const columns = [
    columnHelper.accessor('givenName', {
      header: ({ column }) => <ListColumnHeader column={column} title={tCore`Name`} />,
      cell: ({ row }) => {
        const displayName =
          `${row.original.givenName} ${row.original.familyName}`.trim() ||
          row.original.email ||
          row.original.name;
        const userName = row.original.userName;
        return (
          <DisplayName
            displayName={displayName}
            to={userName ? userRoutes.detail(userName) : undefined}
          />
        );
      },
    }),
    columnHelper.accessor('email', {
      header: ({ column }) => <ListColumnHeader column={column} title={tCore`Email`} />,
      cell: ({ getValue }) => <DisplayText value={getValue() ?? ''} />,
    }),
    columnHelper.accessor('invitationState', {
      header: () => '',
      cell: ({ getValue }) => <BadgeState state={getValue() ?? ''} />,
      enableSorting: false,
    }),
    columnHelper.accessor('expiresAt', {
      header: ({ column }) => <ListColumnHeader column={column} title={tCore`Expires`} />,
      cell: ({ row }) => {
        const { expiresAt, invitationState } = row.original;
        if (!expiresAt || invitationState !== 'Pending') return '—';
        if (new Date(expiresAt) < new Date()) {
          return (
            <span className="text-destructive">
              <Trans>
                Expired <DateTime date={expiresAt} variant="relative" addSuffix />
              </Trans>
            </span>
          );
        }
        return <DateTime date={expiresAt} variant="relative" addSuffix />;
      },
    }),
    columnHelper.accessor('roles', {
      header: ({ column }) => <ListColumnHeader column={column} title={tCore`Role`} />,
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
      pageSize={50}
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
