import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeState } from '@/components/badge';
import { DateFormatter } from '@/components/date';
import { DialogForm } from '@/components/dialog';
import { DisplayId, DisplayName } from '@/components/display';
import { UserRejectDialog, useUserApproval } from '@/features/user';
import { userInviteMutation, userListQuery } from '@/resources/request/client';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-ui/button';
import {
  ClientDataTable,
  ClientDataTableFacetFilter,
  ClientDataTableProvider,
  ClientDataTableSearch,
  createAdvancedSearch,
  useClientDataTableQuery,
} from '@datum-ui/client-data-table';
import { ActionItem, DataTableActiveFilters } from '@datum-ui/data-table';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  ComMiloapisIamV1Alpha1User,
  ComMiloapisIamV1Alpha1UserList,
} from '@openapi/iam.miloapis.com/v1alpha1';
import { createColumnHelper, FilterFn } from '@tanstack/react-table';
import { CheckIcon, EditIcon, RotateCcwIcon, UserPlus, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Users`);
};

const columnHelper = createColumnHelper<ComMiloapisIamV1Alpha1User>();

const columns = [
  columnHelper.accessor('spec.givenName', {
    header: () => <Trans>Name</Trans>,
    cell: ({ row }) => {
      const userName = row.original.metadata?.name ?? '';
      const displayName = `${row.original.spec?.givenName ?? ''} ${row.original.spec?.familyName ?? ''}`;
      const email = row.original.spec?.email ?? '';

      return <DisplayName displayName={displayName} name={email} to={`./${userName}`} />;
    },
  }),
  columnHelper.accessor('metadata.name', {
    header: () => <Trans>ID</Trans>,
    cell: ({ getValue }) => {
      return <DisplayId value={getValue() ?? ''} />;
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
  const [selectedUser, setSelectedUser] = useState<ComMiloapisIamV1Alpha1User | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { approveUser, pendingUser } = useUserApproval();

  const tableState = useClientDataTableQuery<ComMiloapisIamV1Alpha1UserList>({
    queryKeyPrefix: 'users',
    fetchFn: userListQuery,
    useSorting: true,
    useFilters: true,
    useSearch: true,
  });

  const actions: ActionItem<ComMiloapisIamV1Alpha1User>[] = [
    {
      label: t`Manage`,
      icon: EditIcon,
      onClick: (row) => navigate(userRoutes.detail(row.metadata?.name ?? '')),
    },
    {
      label: t`Approve`,
      icon: CheckIcon,
      hide: (row) => row.status?.registrationApproval !== 'Pending',
      onClick: async (row) => {
        setLoadingStates((prev) => ({ ...prev, [row.metadata?.name ?? '']: true }));
        try {
          await approveUser(row, async () => {
            await new Promise((resolve) =>
              setTimeout(() => resolve(tableState.query.refetch()), 1000)
            );
          });
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.metadata?.name ?? '']: false }));
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
        setLoadingStates((prev) => ({ ...prev, [row.metadata?.name ?? '']: true }));
        try {
          await pendingUser(row, async () => {
            await new Promise((resolve) =>
              setTimeout(() => resolve(tableState.query.refetch()), 1000)
            );
          });
        } finally {
          setLoadingStates((prev) => ({ ...prev, [row.metadata?.name ?? '']: false }));
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
      <AppActionBar>
        <Button icon={<UserPlus size={16} />} onClick={() => setInviteDialogOpen(true)}>
          <Trans>Invite User</Trans>
        </Button>
      </AppActionBar>

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

      <ClientDataTableProvider<ComMiloapisIamV1Alpha1User, ComMiloapisIamV1Alpha1UserList>
        columns={columns}
        actions={actions}
        actionsLoading={(row) => loadingStates[row?.metadata?.name ?? ''] || false}
        transform={(data) => data?.items || []}
        filterFn={(row, filters) => {
          if (filters.registrationApproval) {
            return row.status?.registrationApproval === filters.registrationApproval;
          }
          return true;
        }}
        globalFilterFn={createAdvancedSearch<ComMiloapisIamV1Alpha1User>(
          [
            (row) => row.spec?.email?.toLowerCase() || '',
            (row) => row.spec?.givenName?.toLowerCase() || '',
            (row) => row.spec?.familyName?.toLowerCase() || '',
            (row) => row.metadata?.name?.toLowerCase() || '',
          ],
          [
            (row) =>
              `${row.spec?.givenName || ''} ${row.spec?.familyName || ''}`.trim().toLowerCase(),
          ]
        )}
        {...tableState}>
        <div className="m-4 flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <ClientDataTableSearch placeholder={t`Search users...`} />
            <ClientDataTableFacetFilter
              filterKey="registrationApproval"
              label={t`Registration Approval`}
              placeholder={t`Filter by approval`}
              options={[
                { value: 'Approved', label: t`Approved` },
                { value: 'Rejected', label: t`Rejected` },
                { value: 'Pending', label: t`Pending` },
              ]}
            />
          </div>

          <DataTableActiveFilters
            filters={tableState.filters}
            search={tableState.search}
            onClearFilter={tableState.clearFilter}
            onClearAllFilters={tableState.clearAllFilters}
            onClearSearch={tableState.clearSearch}
            filterLabels={{
              registrationApproval: t`Registration Approval`,
            }}
            formatFilterValue={(key, value) => {
              if (key === 'registrationApproval') {
                const labels: Record<string, string> = {
                  Approved: t`Approved`,
                  Rejected: t`Rejected`,
                  Pending: t`Pending`,
                };
                return labels[value] || value;
              }
              return String(value);
            }}
            excludeFilters={['search']}
          />

          <ClientDataTable<ComMiloapisIamV1Alpha1User> />
        </div>
      </ClientDataTableProvider>
    </>
  );
}
