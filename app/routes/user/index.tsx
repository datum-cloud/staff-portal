import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeState } from '@/components/badge';
import { DataTableToolbar } from '@/components/data-table-toolbar';
import { DateTime } from '@/components/date';
import { DialogForm } from '@/components/dialog';
import { DisplayId, DisplayName } from '@/components/display';
import { UserRejectDialog, useUserApproval } from '@/features/user';
import {
  useInvalidateUserList,
  userInviteMutation,
  useUserListQuery,
} from '@/resources/request/client';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { ActionItem, DataTable } from '@datum-cloud/datum-ui/data-table';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { createColumnHelper } from '@tanstack/react-table';
import { CheckIcon, EditIcon, RotateCcwIcon, UserPlus, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';

export const meta: Route.MetaFunction = () => {
  return metaObject(t`Users`);
};

const columnHelper = createColumnHelper<ComMiloapisIamV1Alpha1User>();

export default function Page() {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<ComMiloapisIamV1Alpha1User | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { approveUser, pendingUser } = useUserApproval();
  const tableQuery = useUserListQuery();
  const invalidateUserList = useInvalidateUserList();

  const actions: ActionItem<ComMiloapisIamV1Alpha1User>[] = [
    {
      label: t`Manage`,
      icon: EditIcon,
      onClick: (row) => navigate(userRoutes.detail(row.metadata?.name ?? '')),
    },
    {
      label: t`Approve`,
      icon: CheckIcon,
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
      icon: XIcon,
      variant: 'destructive' as const,
      hidden: (row) => row.status?.registrationApproval !== 'Pending',
      onClick: (row) => setSelectedUser(row),
    },
    {
      label: t`Move to Pending`,
      icon: RotateCcwIcon,
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
        const displayName = `${row.original.spec?.givenName ?? ''} ${row.original.spec?.familyName ?? ''}`;
        const email = row.original.spec?.email ?? '';

        return <DisplayName displayName={displayName} name={email} to={`./${userName}`} />;
      },
    }),
    columnHelper.accessor('metadata.name', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`ID`} />,
      cell: ({ getValue }) => {
        return <DisplayId value={getValue() ?? ''} />;
      },
    }),
    columnHelper.accessor('status.state', {
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Status`} />,
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Active'} />,
    }),
    columnHelper.accessor('status.registrationApproval', {
      id: 'registrationApproval',
      header: ({ column }) => (
        <DataTable.ColumnHeader column={column} title={t`Registration Approval`} />
      ),
      cell: ({ getValue }) => <BadgeState state={getValue() ?? 'Unknown'} />,
    }),
    columnHelper.accessor('metadata.creationTimestamp', {
      id: 'metadata.creationTimestamp',
      header: ({ column }) => <DataTable.ColumnHeader column={column} title={t`Created`} />,
      cell: ({ getValue }) => <DateTime date={getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right" />,
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

      <DataTable.Client
        loading={tableQuery.isLoading}
        data={tableQuery.data?.items ?? []}
        columns={columns}
        pageSize={20}
        getRowId={(row) => row.metadata?.name ?? ''}
        defaultSort={[{ id: 'metadata.creationTimestamp', desc: true }]}
        filterFns={{
          'status.state': (cellValue, filterValue) =>
            String(cellValue ?? '').toLowerCase() === String(filterValue ?? '').toLowerCase(),
          'status.registrationApproval': (cellValue, filterValue) =>
            String(cellValue ?? '').toLowerCase() === String(filterValue ?? '').toLowerCase(),
        }}
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
        }}>
        <Card className="m-4 py-4 shadow-none">
          <CardContent className="flex flex-col gap-2 px-4">
            <DataTableToolbar
              search={
                <DataTable.Search placeholder={t`Search users...`} className="w-full md:w-64" />
              }
              filters={
                <>
                  <DataTable.SelectFilter
                    column="status.state"
                    label={t`Status`}
                    placeholder={t`Filter by status`}
                    options={[
                      { value: 'Active', label: t`Active` },
                      { value: 'Inactive', label: t`Inactive` },
                    ]}
                  />
                  <DataTable.SelectFilter
                    column="status.registrationApproval"
                    label={t`Registration Approval`}
                    placeholder={t`Filter by approval`}
                    options={[
                      { value: 'Approved', label: t`Approved` },
                      { value: 'Rejected', label: t`Rejected` },
                      { value: 'Pending', label: t`Pending` },
                    ]}
                  />
                </>
              }
            />

            <DataTable.ActiveFilters
              excludeFilters={['search']}
              filterLabels={{
                'status.state': t`Status`,
                'status.registrationApproval': t`Registration Approval`,
              }}
              formatFilterValue={{
                'status.state': (value: string) => {
                  const labels: Record<string, string> = {
                    Active: t`Active`,
                    Inactive: t`Inactive`,
                  };
                  return labels[value] ?? String(value);
                },
                'status.registrationApproval': (value: string) => {
                  const labels: Record<string, string> = {
                    Approved: t`Approved`,
                    Rejected: t`Rejected`,
                    Pending: t`Pending`,
                  };
                  return labels[value] ?? String(value);
                },
              }}
            />

            <DataTable.Content
              headerClassName="bg-muted/50"
              className="border-t border-b border-solid"
              emptyMessage={t`No users found.`}
            />
            <DataTable.Pagination className="pb-0" />
          </CardContent>
        </Card>
      </DataTable.Client>
    </>
  );
}
