import { getUserDetailMetadata, useUserDetailData } from '../shared';
import type { Route } from './+types/index';
import { BadgeState } from '@/components/badge';
import { ButtonCopy } from '@/components/button';
import { DangerZoneCard } from '@/components/danger-zone-card';
import { DateTime } from '@/components/date';
import { DialogForm } from '@/components/dialog';
import { UserRejectDialog, useUserApproval } from '@/features/user';
import { useEnv } from '@/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/modules/shadcn/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/modules/shadcn/ui/table';
import { useApp } from '@/providers/app.provider';
import {
  useUserDeactivationQuery,
  userDeactivateMutation,
  userDeleteMutation,
  userReactivateMutation,
} from '@/resources/request/client';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { Button, ButtonLink } from '@datum-ui/button';
import { Form } from '@datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  CheckIcon,
  ExternalLinkIcon,
  RotateCcw,
  Shield,
  ShieldCheckIcon,
  ShieldXIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useRevalidator } from 'react-router';
import { z } from 'zod';

function getSentryIssuesUrl(baseUrl: string | undefined, userId: string): string | null {
  if (!baseUrl) return null;
  const query = `is:unresolved user.username:${userId}`;
  const params = new URLSearchParams({
    query,
    referrer: 'issue-list',
    statsPeriod: '24h',
  });
  return `${baseUrl}/organizations/sentry/issues/?${params.toString()}`;
}

const deactivateSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

export const meta: Route.MetaFunction = ({ matches }) => {
  const { userName } = getUserDetailMetadata(matches);
  return metaObject(`Detail - ${userName}`);
};

export default function Page() {
  const { user } = useApp();
  const { t } = useLingui();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const data = useUserDetailData();
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isMovingToPending, setIsMovingToPending] = useState(false);

  const { data: deactivationData } = useUserDeactivationQuery(
    data.metadata?.name ?? '',
    data.status?.state
  );

  const { approveUser, pendingUser } = useUserApproval();
  const env = useEnv();
  const sentryIssuesUrl = getSentryIssuesUrl(env?.SENTRY_UI_URL, data?.metadata?.name ?? '');

  const handleDeleteUser = async () => {
    await userDeleteMutation(data.metadata?.name ?? '');
    navigate(userRoutes.list());
    toast.success(t`User deleted successfully`);
  };

  const handleDeactivateUser = async (formData: z.infer<typeof deactivateSchema>) => {
    try {
      await userDeactivateMutation({
        reason: formData.reason,
        deactivatedBy: user?.metadata?.name ?? '',
        description: '',
        userRef: {
          name: data.metadata?.name ?? '',
        },
      });
      await new Promise((resolve) => setTimeout(() => resolve(revalidate()), 1000));
      toast.success(t`User deactivated successfully`);
    } catch (error) {
      throw error; // Re-throw to keep dialog open
    }
  };

  const handleReactivateUser = async () => {
    setIsReactivating(true);
    try {
      await userReactivateMutation(deactivationData?.data?.metadata?.name ?? '');
      await new Promise((resolve) => setTimeout(() => resolve(revalidate()), 1000));
      toast.success(t`User reactivated successfully`);
      setIsReactivating(false);
    } catch {
      setIsReactivating(false);
    }
  };

  return (
    <>
      <DialogForm
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        title={t`Deactivate User`}
        description={t`Please provide a reason for deactivating "${data.spec?.givenName ?? ''} ${data.spec?.familyName ?? ''}".`}
        submitText={t`Deactivate`}
        cancelText={t`Cancel`}
        onSubmit={handleDeactivateUser}
        schema={deactivateSchema}
        defaultValues={{ reason: '' }}>
        <Form.Input
          field="reason"
          label={t`Reason for deactivation`}
          placeholder={t`Enter reason for deactivation...`}
          required
        />
      </DialogForm>

      <UserRejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        user={data}
        onSuccess={async () => {
          revalidate();
        }}
      />

      <div className="m-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <Title level={1}>
              {data?.spec?.givenName} {data?.spec?.familyName}
            </Title>
            <Text textColor="muted">{data?.spec?.email}</Text>
          </div>

          <div className="flex items-center gap-2">
            {sentryIssuesUrl && (
              <ButtonLink
                href={sentryIssuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                theme="outline"
                size="small"
                icon={<ExternalLinkIcon size={16} />}
                iconPosition="right">
                <Trans>View in Sentry</Trans>
              </ButtonLink>
            )}
            {data?.status?.registrationApproval === 'Pending' ? (
              <>
                <Button
                  theme="outline"
                  size="small"
                  icon={<CheckIcon size={16} />}
                  loading={isApproving}
                  onClick={async () => {
                    setIsApproving(true);
                    try {
                      await approveUser(data, async () => {
                        revalidate();
                      });
                    } finally {
                      setIsApproving(false);
                    }
                  }}>
                  <Trans>Approve</Trans>
                </Button>
                <Button
                  theme="outline"
                  type="danger"
                  size="small"
                  icon={<XIcon size={16} />}
                  onClick={() => setRejectDialogOpen(true)}>
                  <Trans>Reject</Trans>
                </Button>
              </>
            ) : (
              <Button
                theme="outline"
                size="small"
                icon={<RotateCcw size={16} />}
                loading={isMovingToPending}
                onClick={async () => {
                  setIsMovingToPending(true);
                  try {
                    await pendingUser(data, async () => {
                      revalidate();
                    });
                  } finally {
                    setIsMovingToPending(false);
                  }
                }}>
                <Trans>Move to Pending</Trans>
              </Button>
            )}
          </div>
        </div>

        <Card className="mt-4 shadow-none">
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>ID</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Text>{data?.metadata?.name}</Text>
                      <ButtonCopy value={data?.metadata?.name ?? ''} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Full Name</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>
                      {data?.spec?.givenName} {data?.spec?.familyName}
                    </Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Email</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>{data?.spec?.email}</Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Registration Approval</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <BadgeState state={data?.status?.registrationApproval ?? 'Unknown'} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Status</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <BadgeState state={data?.status?.state ?? 'Active'} />
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell width="25%">
                    <Text textColor="muted">
                      <Trans>Created</Trans>
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text>
                      <DateTime date={data?.metadata?.creationTimestamp} variant="both" />
                    </Text>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-4 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <Trans>Account Management</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>Manage user access and account status</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.status?.state === 'Inactive' ? (
              <>
                <div className="flex items-center justify-between rounded-lg border border-green-500 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div>
                    <Title
                      level={6}
                      weight="medium"
                      textColor="success"
                      className="flex items-center gap-2">
                      <ShieldCheckIcon className="h-4 w-4" />
                      <Trans>Reactivate User</Trans>
                    </Title>
                    <Text textColor="success" size="sm" as="p">
                      <Trans>
                        Re-enable this user&apos;s access to the system. They will be able to sign
                        in immediately.
                      </Trans>
                    </Text>
                  </div>
                  <Button
                    type="success"
                    size="small"
                    loading={isReactivating}
                    onClick={() => handleReactivateUser()}>
                    <Trans>Reactivate</Trans>
                  </Button>
                </div>

                <div className="mt-3 space-y-2 rounded-md border bg-gray-200/50 p-3">
                  <div className="flex items-center gap-2">
                    <Text size="sm" weight="medium">
                      <Trans>Deactivation Details</Trans>
                    </Text>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Text textColor="muted" size="sm">
                        <Trans>Deactivated By:</Trans>
                      </Text>
                      <Text size="sm">{deactivationData?.data?.spec?.deactivatedBy}</Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <Text textColor="muted" size="sm">
                        <Trans>Deactivated At:</Trans>
                      </Text>
                      <Text size="sm">
                        <DateTime
                          date={deactivationData?.data?.metadata?.creationTimestamp ?? ''}
                        />
                      </Text>
                    </div>
                    <div className="flex items-start gap-2">
                      <Text textColor="muted" size="sm">
                        <Trans>Deactivation Reason:</Trans>
                      </Text>
                      <Text size="sm">{deactivationData?.data?.spec?.reason}</Text>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-yellow-500 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                <div>
                  <Title
                    level={6}
                    weight="medium"
                    textColor="warning"
                    className="flex items-center gap-2">
                    <ShieldXIcon className="h-4 w-4" />
                    <Trans>Deactivate User</Trans>
                  </Title>
                  <Text textColor="warning" size="sm" as="p">
                    <Trans>
                      Temporarily prevent user from signing in. The user can be reactivated at any
                      time and all data will remain intact.
                    </Trans>
                  </Text>
                </div>
                <Button type="warning" size="small" onClick={() => setDeactivateDialogOpen(true)}>
                  <Trans>Deactivate</Trans>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <DangerZoneCard
          deleteTitle={t`Delete User`}
          deleteDescription={t`Permanently delete this user and all associated data`}
          dialogTitle={t`Delete User`}
          dialogDescription={t`Are you sure you want to delete user "${data.spec?.givenName ?? ''} ${data.spec?.familyName ?? ''}"? This action cannot be undone.`}
          onConfirm={handleDeleteUser}
        />
      </div>
    </>
  );
}
