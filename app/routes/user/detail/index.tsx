import { getUserDetailMetadata, useUserDetailData } from '../shared';
import type { Route } from './+types/index';
import { ActionCard } from '@/components/action-card';
import { BadgeState } from '@/components/badge';
import { ButtonCopy } from '@/components/button';
import { DangerZoneCard } from '@/components/danger-zone-card';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DialogForm } from '@/components/dialog';
import { PageHeader } from '@/components/page-header';
import { UserRejectDialog, useUserApproval } from '@/features/user';
import { useEnv } from '@/hooks';
import { useApp } from '@/providers/app.provider';
import {
  useUserDeactivationQuery,
  userDeactivateMutation,
  userDeleteMutation,
  userReactivateMutation,
} from '@/resources/request/client';
import { userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
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
        <Form.Field name="reason" label={t`Reason for deactivation`} required>
          <Form.Input placeholder={t`Enter reason for deactivation...`} />
        </Form.Field>
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
        <PageHeader
          title={`${data?.spec?.givenName ?? ''} ${data?.spec?.familyName ?? ''}`}
          description={data?.spec?.email}
          actions={
            <>
              {sentryIssuesUrl && (
                <LinkButton
                  href={sentryIssuesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  theme="outline"
                  size="small"
                  icon={<ExternalLinkIcon size={16} />}
                  iconPosition="right">
                  <Trans>View in Sentry</Trans>
                </LinkButton>
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
            </>
          }
        />

        <Card className="mt-4 shadow-none">
          <CardContent>
            <DescriptionList
              items={[
                {
                  label: <Trans>ID</Trans>,
                  value: (
                    <div className="flex items-center gap-2">
                      <Text>{data?.metadata?.name}</Text>
                      <ButtonCopy value={data?.metadata?.name ?? ''} />
                    </div>
                  ),
                },
                {
                  label: <Trans>Full Name</Trans>,
                  value: (
                    <Text>
                      {data?.spec?.givenName} {data?.spec?.familyName}
                    </Text>
                  ),
                },
                {
                  label: <Trans>Email</Trans>,
                  value: <Text>{data?.spec?.email}</Text>,
                },
                {
                  label: <Trans>Registration Approval</Trans>,
                  value: <BadgeState state={data?.status?.registrationApproval ?? 'Unknown'} />,
                },
                {
                  label: <Trans>Status</Trans>,
                  value: <BadgeState state={data?.status?.state ?? 'Active'} />,
                },
                {
                  label: <Trans>Created</Trans>,
                  value: (
                    <Text>
                      <DateTime date={data?.metadata?.creationTimestamp} variant="both" />
                    </Text>
                  ),
                },
              ]}
            />
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
                <ActionCard
                  variant="success"
                  icon={ShieldCheckIcon}
                  title={<Trans>Reactivate User</Trans>}
                  description={
                    <Trans>
                      Re-enable this user&apos;s access to the system. They will be able to sign in
                      immediately.
                    </Trans>
                  }
                  action={
                    <Button
                      type="success"
                      size="small"
                      loading={isReactivating}
                      onClick={() => handleReactivateUser()}>
                      <Trans>Reactivate</Trans>
                    </Button>
                  }
                />

                <div className="bg-muted/40 mt-3 rounded-md border p-3">
                  <Text size="sm" weight="medium" className="mb-2 block">
                    <Trans>Deactivation Details</Trans>
                  </Text>
                  <DescriptionList
                    labelWidth="40%"
                    items={[
                      {
                        label: (
                          <Text textColor="muted" size="sm">
                            <Trans>Deactivated By</Trans>
                          </Text>
                        ),
                        value: <Text size="sm">{deactivationData?.data?.spec?.deactivatedBy}</Text>,
                      },
                      {
                        label: (
                          <Text textColor="muted" size="sm">
                            <Trans>Deactivated At</Trans>
                          </Text>
                        ),
                        value: (
                          <Text size="sm">
                            <DateTime
                              date={deactivationData?.data?.metadata?.creationTimestamp ?? ''}
                            />
                          </Text>
                        ),
                      },
                      {
                        label: (
                          <Text textColor="muted" size="sm">
                            <Trans>Deactivation Reason</Trans>
                          </Text>
                        ),
                        value: <Text size="sm">{deactivationData?.data?.spec?.reason}</Text>,
                      },
                    ]}
                  />
                </div>
              </>
            ) : (
              <ActionCard
                variant="warning"
                icon={ShieldXIcon}
                title={<Trans>Deactivate User</Trans>}
                description={
                  <Trans>
                    Temporarily prevent user from signing in. The user can be reactivated at any
                    time and all data will remain intact.
                  </Trans>
                }
                action={
                  <Button type="warning" size="small" onClick={() => setDeactivateDialogOpen(true)}>
                    <Trans>Deactivate</Trans>
                  </Button>
                }
              />
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
