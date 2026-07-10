import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogForm } from '@/components/dialog';
import { DisplayId, DisplayName, DisplayText } from '@/components/display';
import { UserAvatar } from '@/components/user-avatar';
import { DATE_RANGE_OPTIONS, ListGrowthChart, ListPage, ListTable } from '@/features/milo';
import { UserRejectDialog, useUserApproval } from '@/features/user';
import {
  useAllUsersQuery,
  useInvalidateUserList,
  userInviteMutation,
} from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Users`);
};

const columnHelper = createColumnHelper<ComMiloapisIamV1Alpha1User>();

const getUserCreatedAt = (user: ComMiloapisIamV1Alpha1User) => user.metadata?.creationTimestamp;

export default function Page() {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<ComMiloapisIamV1Alpha1User | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { approveUser, pendingUser } = useUserApproval();
  const tableQuery = useAllUsersQuery();
  const users = useMemo(() => tableQuery.data?.items ?? [], [tableQuery.data]);
  const invalidateUserList = useInvalidateUserList();

  const actions: ActionItem<ComMiloapisIamV1Alpha1User>[] = [
    {
      label: t`Manage`,
      icon: <ACTION_ICONS.edit className="size-4" />,
      onClick: (row) => navigate(userRoutes.detail(row.metadata?.name ?? '')),
    },
    {
      label: t`Approve`,
      icon: <ACTION_ICONS.check className="size-4" />,
      hidden: (row) => row.status?.registrationApproval !== 'Pending',
      onClick: async (row) => {
        setLoadingStates((prev) => ({ ...prev, [row.metadata?.name ?? '']: true }));
        try {
          await approveUser(row, async () => {
            await invalidateUserList();
          });
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.metadata?.name ?? '']: false }));
        }
      },
    },
    {
      label: t`Reject`,
      icon: <ACTION_ICONS.close className="size-4" />,
      variant: 'destructive' as const,
      hidden: (row) => row.status?.registrationApproval !== 'Pending',
      onClick: (row) => setSelectedUser(row),
    },
    {
      label: t`Move to Pending`,
      icon: <ACTION_ICONS.reset className="size-4" />,
      hidden: (row) => row.status?.registrationApproval === 'Pending',
      onClick: async (row) => {
        setLoadingStates((prev) => ({ ...prev, [row.metadata?.name ?? '']: true }));
        try {
          await pendingUser(row, async () => {
            await invalidateUserList();
          });
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.metadata?.name ?? '']: false }));
        }
      },
    },
  ];

  const columns = [
    columnHelper.accessor('spec.givenName', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Name`} />,
      cell: ({ row }) => {
        const userName = row.original.metadata?.name ?? '';
        const displayName =
          `${row.original.spec?.givenName ?? ''} ${row.original.spec?.familyName ?? ''}`.trim();
        const email = row.original.spec?.email ?? '';

        return (
          <div className="flex items-center gap-2.5">
            <UserAvatar
              name={displayName || email}
              avatarUrl={row.original.status?.avatarUrl}
              className="size-7 shrink-0 rounded-md"
              fallbackClassName="rounded-md text-xs"
            />
            <DisplayName displayName={displayName} name={email} to={`./${userName}`} />
          </div>
        );
      },
    }),
    columnHelper.accessor('spec.email', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Email`} />,
      cell: ({ getValue }) => <DisplayText value={getValue() ?? ''} />,
    }),
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => {
        return <DisplayId value={getValue() ?? ''} />;
      },
    }),
    columnHelper.accessor('status.state', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Status`} />,
      cell: ({ getValue }) => <BadgeState variant="dot" state={getValue() ?? 'Active'} />,
    }),
    columnHelper.accessor('status.registrationApproval', {
      id: 'registrationApproval',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Registration`} />,
      cell: ({ getValue }) => <BadgeState variant="dot" state={getValue() ?? 'Unknown'} />,
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => null,
      cell: ({ row }) => (
        <div className="flex w-full justify-end">
          <DataTable.RowActions
            isLoading={loadingStates[row.original.metadata?.name ?? '']}
            row={row}
            actions={actions}
          />
        </div>
      ),
    }),
  ];

  const inviteSchema = z
    .object({
      givenName: z.string().nonempty(t`First name is required`),
      familyName: z.string().nonempty(t`Last name is required`),
      email: z.email(t`Invalid email address`).nonempty(t`Email is required`),
      scheduleEnabled: z.boolean().optional(),
      scheduleAt: z.coerce.date().optional(),
    })
    .refine(
      (data) => {
        if (data.scheduleEnabled === true) {
          return data.scheduleAt !== undefined && data.scheduleAt !== null;
        }
        return true;
      },
      {
        message: t`Schedule date and time is required`,
        path: ['scheduleAt'],
      }
    );

  return (
    <>
      <DialogForm
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        title={t`Invite User`}
        submitText={t`Invite`}
        cancelText={t`Cancel`}
        schema={inviteSchema}
        defaultValues={{
          givenName: '',
          familyName: '',
          email: '',
          scheduleEnabled: false,
          scheduleAt: undefined,
        }}
        onSubmit={async (formData: z.infer<typeof inviteSchema>) => {
          try {
            await userInviteMutation({
              apiVersion: 'iam.miloapis.com/v1alpha1',
              kind: 'PlatformInvitation',
              metadata: { generateName: 'platform-invitation-' },
              spec: {
                email: formData.email,
                familyName: formData.familyName,
                givenName: formData.givenName,
                ...(formData.scheduleEnabled && {
                  scheduleAt: formData.scheduleAt?.toISOString(),
                }),
              },
            });

            await invalidateUserList();
            toast.success(t`User invited successfully`);
          } catch (error) {
            throw error; // Re-throw to keep dialog open
          }
        }}>
        <>
          <Form.Field name="givenName" label={t`First Name`} required>
            <Form.Input placeholder={t`Enter first name`} />
          </Form.Field>
          <Form.Field name="familyName" label={t`Last Name`} required>
            <Form.Input />
          </Form.Field>
          <Form.Field name="email" label={t`Email`} required>
            <Form.Input />
          </Form.Field>
          <Form.Field name="scheduleEnabled">
            <Form.Switch label={t`Schedule invitation to be sent at specific time`} />
          </Form.Field>
          <Form.When field="scheduleEnabled" is={true}>
            <Form.Field name="scheduleAt" label={t`Schedule At`} required>
              <Form.DateTimePicker
                modal
                placeholder={t`Pick date and time Test`}
                showTimezoneIndicator
              />
            </Form.Field>
          </Form.When>
        </>
      </DialogForm>

      <UserRejectDialog
        open={!!selectedUser}
        onOpenChange={() => setSelectedUser(null)}
        user={selectedUser}
        onSuccess={async () => {
          await invalidateUserList();
        }}
      />

      <ListPage>
        <ListTable
          loading={tableQuery.isLoading}
          data={users}
          columns={columns}
          pageSize={50}
          actions={
            <Button
              icon={<ACTION_ICONS.invite size={16} />}
              onClick={() => setInviteDialogOpen(true)}>
              <Trans>Invite User</Trans>
            </Button>
          }
          getRowId={(row) => row.metadata?.name ?? ''}
          defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
          hasMore={tableQuery.data?.hasMore ?? false}
          hasMoreMessage={t`Limited to 10,000 users. Refine your search to surface others.`}
          searchPlaceholder={t`Search users...`}
          emptyMessage={t`No users found.`}
          toolbar={
            <ListGrowthChart items={users} getCreatedAt={getUserCreatedAt} title={t`Total users`} />
          }
          filters={[
            {
              column: 'status.registrationApproval',
              label: t`Registration`,
              options: [
                { value: 'Pending', label: <BadgeState state="Pending" /> },
                { value: 'Approved', label: <BadgeState state="Approved" /> },
                { value: 'Rejected', label: <BadgeState state="Rejected" /> },
              ],
            },
            {
              column: 'status.state',
              label: t`Status`,
              options: [
                { value: 'Active', label: <BadgeState state="Active" /> },
                { value: 'Inactive', label: <BadgeState state="Inactive" /> },
              ],
            },
            {
              column: 'metadata.creationTimestamp',
              label: t`Created`,
              type: 'dateRange',
              options: DATE_RANGE_OPTIONS,
            },
          ]}
          searchFn={(row, search) => {
            const q = search.trim().toLowerCase();
            if (!q) return true;

            const fields = [
              row.spec?.email,
              row.spec?.givenName,
              row.spec?.familyName,
              row.metadata?.name,
              `${row.spec?.givenName ?? ''} ${row.spec?.familyName ?? ''}`.trim(),
            ];

            return fields
              .map((value) => (value ?? '').toLowerCase())
              .some((value) => value.includes(q));
          }}
        />
      </ListPage>
    </>
  );
}
