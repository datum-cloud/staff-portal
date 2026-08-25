import type { Route } from './+types/index';
import { AppBadge } from '@/components/badge';
import { DateTime } from '@/components/date';
import { DialogForm } from '@/components/dialog';
import { DisplayId, DisplayName, DisplayText } from '@/components/display';
import GitHubIcon from '@/components/icon/github';
import GoogleIcon from '@/components/icon/google';
import { UserAvatar } from '@/components/user-avatar';
import {
  DATE_RANGE_OPTIONS,
  ListGrowthChart,
  ListPage,
  ListTable,
  ListColumnHeader,
} from '@/features/milo';
import { UserRejectDialog, useUserPlatformAccess } from '@/features/user';
import {
  useAllUsersQuery,
  useInvalidateUserList,
  userInviteMutation,
} from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { createColumnHelper } from '@/utils/table';
import { Button } from '@datum-cloud/datum-ui/button';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { MailIcon, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Users`);
};

const LOGIN_PROVIDERS: Record<
  string,
  { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> | LucideIcon }
> = {
  google: { label: 'Google', Icon: GoogleIcon },
  github: { label: 'GitHub', Icon: GitHubIcon },
  email: { label: 'Email', Icon: MailIcon },
};

const columnHelper = createColumnHelper<ComMiloapisIamV1Alpha1User>();

const getUserCreatedAt = (user: ComMiloapisIamV1Alpha1User) => user.metadata?.creationTimestamp;

export default function Page() {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<ComMiloapisIamV1Alpha1User | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { setState } = useUserPlatformAccess();
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
      hidden: (row) => row.status?.platformAccess !== 'Pending',
      onClick: async (row) => {
        setLoadingStates((prev) => ({ ...prev, [row.metadata?.name ?? '']: true }));
        try {
          await setState(row, 'Approved', undefined, async () => {
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
      hidden: (row) => row.status?.platformAccess !== 'Pending',
      onClick: (row) => setSelectedUser(row),
    },
    {
      label: t`Move to Pending`,
      icon: <ACTION_ICONS.reset className="size-4" />,
      hidden: (row) => row.status?.platformAccess === 'Pending',
      onClick: async (row) => {
        setLoadingStates((prev) => ({ ...prev, [row.metadata?.name ?? '']: true }));
        try {
          await setState(row, 'Pending', undefined, async () => {
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
      header: ({ column }) => <ListColumnHeader column={column} title={t`Name`} />,
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
              className="size-7 shrink-0"
              fallbackClassName="text-xs"
            />
            <DisplayName displayName={displayName || email} to={`./${userName}`} />
          </div>
        );
      },
    }),
    columnHelper.accessor('spec.email', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`Email`} />,
      cell: ({ getValue, row }) => {
        const email = getValue() ?? '';
        const provider = row.original.status?.lastLoginProvider?.toLowerCase() ?? '';
        const providerMeta = LOGIN_PROVIDERS[provider];
        return (
          <div className="flex min-w-0 items-center gap-2">
            {providerMeta ? (
              <Tooltip message={t`Last signed in with ${providerMeta.label}`}>
                <providerMeta.Icon className="text-muted-foreground size-3.5 shrink-0" />
              </Tooltip>
            ) : null}
            <DisplayText value={email} />
          </div>
        );
      },
    }),
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <ListColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => {
        return <DisplayId value={getValue() ?? ''} />;
      },
    }),
    columnHelper.accessor('status.platformAccess', {
      id: 'platformAccess',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Access State`} />,
      cell: ({ getValue }) => <AppBadge status={getValue() ?? 'Pending'} />,
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <ListColumnHeader column={column} title={t`Created`} />,
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
            <ListGrowthChart
              items={users}
              getCreatedAt={getUserCreatedAt}
              title={t`Total users`}
              loading={tableQuery.isLoading}
            />
          }
          filters={[
            {
              column: 'status.platformAccess',
              label: t`Access State`,
              options: [
                { value: 'Pending', label: <AppBadge status="pending" /> },
                { value: 'Approved', label: <AppBadge status="approved" /> },
                { value: 'Suspended', label: <AppBadge status="suspended" /> },
                { value: 'Rejected', label: <AppBadge status="rejected" /> },
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
              row.status?.lastLoginProvider,
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
