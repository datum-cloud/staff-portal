import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DialogForm } from '@/components/dialog';
import { DisplayId, DisplayName } from '@/components/display';
import { UserRejectDialog, useUserApproval } from '@/features/user';
import { userInviteMutation, userListQuery } from '@/resources/request/client';
import { User, UserListResponse } from '@/resources/schemas';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-ui/button';
import {
  ActionItem,
  DataTable,
  DataTableFacetFilter,
  DataTableProvider,
  useDataTableQuery,
} from '@datum-ui/data-table';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckIcon, EditIcon, RotateCcwIcon, UserPlus, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Users`);
};

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor('spec.givenName', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const userName = row.original.metadata.name;
      const displayName = `${row.original.spec.givenName} ${row.original.spec.familyName}`;
      const email = row.original.spec.email;

      return <DisplayName displayName={displayName} name={email} to={`./${userName}`} />;
    },
  }),
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>ID</Trans>,
    cell: ({ getValue }) => {
      return <DisplayId value={getValue()} />;
    },
  }),
  columnHelper.accessor('status.state', {
    header: () => <Trans>Status</Trans>,
    cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Active'} />,
  }),
  columnHelper.accessor('status.registrationApproval', {
    header: () => <Trans>Registration Approval</Trans>,
    cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Unknown'} />,
  }),
  columnHelper.accessor('metadata.creationTimestamp', {
    header: () => <Trans>Created</Trans>,
    cell: ({ getValue }) => <DateFormatter date={getValue()} withTime />,
  }),
];

export default function Page() {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { approveUser, pendingUser } = useUserApproval();

  const tableState = useDataTableQuery<UserListResponse>({
    queryKeyPrefix: ['users'],
    fetchFn: (args) => userListQuery(args),
    useSorting: true,
    useFilters: true,
    useSearch: true,
  });

  const actions: ActionItem<User>[] = [
    {
      label: t`Manage`,
      icon: EditIcon,
      onClick: (row) => navigate(userRoutes.detail(row.metadata.name)),
    },
    {
      label: t`Approve`,
      icon: CheckIcon,
      hide: (row) => row.status?.registrationApproval !== 'Pending',
      onClick: async (row) => {
        setLoadingStates((prev) => ({ ...prev, [row.metadata.name]: true }));
        try {
          await approveUser(row, async () => {
            await new Promise((resolve) =>
              setTimeout(() => resolve(tableState.query.refetch()), 1000)
            );
          });
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.metadata.name]: false }));
        }
      },
    },
    {
      label: t`Reject`,
      icon: XIcon,
      variant: 'destructive' as const,
      hide: (row) => row.status?.registrationApproval !== 'Pending',
      onClick: (row) => setSelectedUser(row),
    },
    {
      label: t`Move to Pending`,
      icon: RotateCcwIcon,
      hide: (row) => row.status?.registrationApproval === 'Pending',
      onClick: async (row) => {
        setLoadingStates((prev) => ({ ...prev, [row.metadata.name]: true }));
        try {
          await pendingUser(row, async () => {
            await new Promise((resolve) =>
              setTimeout(() => resolve(tableState.query.refetch()), 1000)
            );
          });
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.metadata.name]: false }));
        }
      },
    },
  ];

  const inviteSchema = z
    .object({
      givenName: z.string().nonempty(t`First name is required`),
      familyName: z.string().nonempty(t`Last name is required`),
      email: z.email(t`Invalid email address`).nonempty(t`Email is required`),
      scheduleEnabled: z.boolean().optional(),
      scheduleAt: z.date().optional(),
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

            await new Promise((resolve) =>
              setTimeout(() => resolve(tableState.query.refetch()), 1000)
            );
            toast.success(t`User invited successfully`);
          } catch (error) {
            throw error; // Re-throw to keep dialog open
          }
        }}>
        {(form) => (
          <>
            <Form.Input field="givenName" label={t`First Name`} required />
            <Form.Input field="familyName" label={t`Last Name`} required />
            <Form.Input field="email" label={t`Email`} required />
            <Form.Switch
              field="scheduleEnabled"
              label={t`Schedule invitation to be sent at specific time`}
            />
            {form.watch('scheduleEnabled') && (
              <Form.DateTimePicker modal field="scheduleAt" required />
            )}
          </>
        )}
      </DialogForm>

      <UserRejectDialog
        open={!!selectedUser}
        onOpenChange={() => setSelectedUser(null)}
        user={selectedUser}
        onSuccess={async () => {
          await new Promise((resolve) =>
            setTimeout(() => resolve(tableState.query.refetch()), 1000)
          );
        }}
      />

      <DataTableProvider<User, UserListResponse>
        columns={columns}
        actions={actions}
        actionsLoading={(row) => loadingStates[row.metadata.name] || false}
        transform={(data) => {
          return {
            rows: data?.data?.items || [],
            cursor: data?.data?.metadata?.continue,
          };
        }}
        {...tableState}>
        <div className="m-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* <DataTableSearch
                placeholder={t`Search users...`}
                value={tableState.search}
                onValueChange={tableState.setSearch || (() => {})}
              /> */}

              <DataTableFacetFilter
                label={t`Registration Approval`}
                placeholder={t`Filter by approval`}
                options={[
                  { value: 'Approved', label: t`Approved` },
                  { value: 'Rejected', label: t`Rejected` },
                  { value: 'Pending', label: t`Pending` },
                ]}
                value={tableState.filters.registrationApproval}
                onValueChange={(value) => {
                  if (value) tableState.setFilter('registrationApproval', value);
                  else tableState.clearFilter('registrationApproval');
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button icon={<UserPlus size={16} />} onClick={() => setInviteDialogOpen(true)}>
                {t`Invite User`}
              </Button>
            </div>
          </div>

          <DataTable<User> />
        </div>
      </DataTableProvider>
    </>
  );
}
