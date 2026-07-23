import { getUserDetailMetadata, useUserDetailData } from '../shared';
import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeState } from '@/components/badge';
import { ButtonCopy } from '@/components/button';
import { DangerZoneCard } from '@/components/danger-zone-card';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
import { DialogForm } from '@/components/dialog';
import { buildMaxmindRowGroups, extractMaxmindInsights } from '@/features/fraud';
import { SectionCard } from '@/features/milo';
import {
  PLATFORM_ACCESS_STATES,
  PlatformAccessState,
  useUserPlatformAccess,
} from '@/features/user';
import { UserIdentityCard } from '@/features/user/components/user-identity-card';
import { useEnv } from '@/hooks';
import {
  useFraudEvaluationListQuery,
  usePlatformAccessQuery,
  userDeleteMutation,
  userQueryKeys,
} from '@/resources/request/client';
import { ACTION_ICONS } from '@/utils/config/icons.config';
import { fraudRoutes, userRoutes } from '@/utils/config/routes.config';
import { metaObject } from '@/utils/helpers';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import { Globe, Loader2, Mail, MapPin, Shield, ShieldAlert, UserIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useRevalidator } from 'react-router';
import { z } from 'zod';

function getScoreColor(decision?: string) {
  if (decision === 'DEACTIVATE') return 'text-red-600 dark:text-red-400';
  if (decision === 'REVIEW') return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

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

// Moving to these states requires an explanatory reason (written to spec.reason);
// Approved/Pending apply directly.
const STATES_REQUIRING_REASON: PlatformAccessState[] = ['Suspended', 'Rejected'];

const reasonSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

export const meta: Route.MetaFunction = ({ matches }) => {
  const { userName } = getUserDetailMetadata(matches);
  return metaObject(`Detail - ${userName}`);
};

export default function Page() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const queryClient = useQueryClient();
  const data = useUserDetailData();
  const userId = data.metadata?.name ?? '';

  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingState, setPendingState] = useState<PlatformAccessState | null>(null);
  const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);

  const { data: platformAccess, isLoading: isPlatformAccessLoading } =
    usePlatformAccessQuery(userId);
  const currentState = platformAccess?.spec?.state as PlatformAccessState | undefined;

  const { setState } = useUserPlatformAccess();
  const env = useEnv();

  const { data: fraudEvalData, isLoading: isFraudLoading } = useFraudEvaluationListQuery(
    data.metadata?.name ? { search: data.metadata.name } : undefined
  );
  const latestEval = fraudEvalData?.items?.[0];
  const maxmindInsights = extractMaxmindInsights(latestEval);
  const maxmindGroups = buildMaxmindRowGroups(maxmindInsights);
  const sentryIssuesUrl = getSentryIssuesUrl(env?.SENTRY_UI_URL, data?.metadata?.name ?? '');

  const handleDeleteUser = async () => {
    await userDeleteMutation(data.metadata?.name ?? '');
    navigate(userRoutes.list());
    toast.success(t`User deleted successfully`);
  };

  const applyState = async (state: PlatformAccessState, reason?: string) => {
    setIsUpdatingAccess(true);
    try {
      await setState(data, state, reason, async () => {
        await queryClient.invalidateQueries({ queryKey: userQueryKeys.platformAccess(userId) });
        revalidate();
      });
    } finally {
      setIsUpdatingAccess(false);
    }
  };

  // Picking a state either opens the reason dialog (Suspend/Reject) or applies directly.
  // The Select stays bound to the server's `currentState`, so cancelling reverts on its own.
  const handleStateSelect = (value: string) => {
    const next = value as PlatformAccessState;
    if (next === currentState) return;

    if (STATES_REQUIRING_REASON.includes(next)) {
      setPendingState(next);
      setReasonDialogOpen(true);
      return;
    }

    void applyState(next);
  };

  const handleReasonSubmit = async (formData: z.infer<typeof reasonSchema>) => {
    if (!pendingState) return;
    try {
      await applyState(pendingState, formData.reason);
    } catch (error) {
      throw error; // Re-throw to keep the dialog open on failure
    }
  };

  return (
    <>
      <DialogForm
        open={reasonDialogOpen}
        onOpenChange={setReasonDialogOpen}
        title={t`Set access to ${pendingState ?? ''}`}
        description={t`Please provide a reason for setting "${data.spec?.givenName ?? ''} ${data.spec?.familyName ?? ''}" to ${pendingState ?? ''}.`}
        submitText={t`Confirm`}
        cancelText={t`Cancel`}
        onSubmit={handleReasonSubmit}
        schema={reasonSchema}
        defaultValues={{ reason: '' }}>
        <Form.Field name="reason" label={t`Reason`} required>
          <Form.Input placeholder={t`Enter a reason...`} />
        </Form.Field>
      </DialogForm>

      <div className="m-4 flex flex-col gap-1">
        <AppActionBar>
          <>
            {sentryIssuesUrl && (
              <LinkButton
                href={sentryIssuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                theme="outline"
                size="small"
                icon={<ACTION_ICONS.externalLink size={16} />}
                iconPosition="right">
                <Trans>View in Sentry</Trans>
              </LinkButton>
            )}
          </>
        </AppActionBar>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:[&>:last-child:nth-child(odd)]:col-span-2">
          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                <Trans>User</Trans>
              </span>
            }>
            <DescriptionList
              labelWidth="40%"
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
                  label: <Trans>Access State</Trans>,
                  value: <BadgeState state={currentState ?? 'Unknown'} />,
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
          </SectionCard>

          <UserIdentityCard
            userId={data?.metadata?.name ?? ''}
            readOnly
            showSessions
            className="shadow-none"
          />

          {maxmindGroups.network.length > 0 && (
            <SectionCard
              title={
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <Trans>IP & Network</Trans>
                </span>
              }>
              <DescriptionList labelWidth="40%" items={maxmindGroups.network} />
            </SectionCard>
          )}

          {maxmindGroups.location.length > 0 && (
            <SectionCard
              title={
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <Trans>Location</Trans>
                </span>
              }>
              <DescriptionList labelWidth="40%" items={maxmindGroups.location} />
            </SectionCard>
          )}

          {maxmindGroups.email.length > 0 && (
            <SectionCard
              title={
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <Trans>Email Domain</Trans>
                </span>
              }>
              <DescriptionList labelWidth="40%" items={maxmindGroups.email} />
            </SectionCard>
          )}

          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <Trans>Fraud Assessment</Trans>
              </span>
            }
            description={<Trans>Latest fraud evaluation for this user</Trans>}>
            {isFraudLoading ? (
              <Text textColor="muted" size="sm">
                <Trans>Loading...</Trans>
              </Text>
            ) : latestEval ? (
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <Text textColor="muted" size="sm">
                      <Trans>Score</Trans>
                    </Text>
                    <span
                      className={`font-mono text-2xl font-bold ${getScoreColor(latestEval.status?.decision)}`}>
                      {latestEval.status?.compositeScore ?? '-'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Text textColor="muted" size="sm">
                      <Trans>Decision</Trans>
                    </Text>
                    <BadgeState
                      state={
                        latestEval.status?.decision === 'DEACTIVATE'
                          ? 'error'
                          : latestEval.status?.decision === 'REVIEW'
                            ? 'warning'
                            : 'pending'
                      }
                      message={latestEval.status?.decision ?? 'NONE'}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Text textColor="muted" size="sm">
                      <Trans>Last Evaluated</Trans>
                    </Text>
                    <Text size="sm">
                      <DateTime date={latestEval.status?.lastEvaluationTime} variant="both" />
                    </Text>
                  </div>
                </div>
                <Button
                  theme="outline"
                  size="small"
                  icon={<ACTION_ICONS.externalLink size={16} />}
                  onClick={() =>
                    navigate(fraudRoutes.evaluations.detail(latestEval.metadata?.name ?? ''))
                  }>
                  <Trans>View Evaluation</Trans>
                </Button>
              </div>
            ) : (
              <Text textColor="muted" size="sm">
                <Trans>No fraud evaluations found for this user.</Trans>
              </Text>
            )}
          </SectionCard>
        </div>

        <SectionCard
          className="mt-4"
          title={
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <Trans>Account Management</Trans>
            </span>
          }
          description={<Trans>Manage this user&apos;s platform access state</Trans>}>
          {isPlatformAccessLoading ? (
            <Text textColor="muted" size="sm">
              <Trans>Loading...</Trans>
            </Text>
          ) : platformAccess ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <Text size="sm" weight="medium">
                    <Trans>Platform Access State</Trans>
                  </Text>
                  <Text textColor="muted" size="sm">
                    <Trans>
                      Controls whether this user can sign in and access the platform. Suspending or
                      rejecting requires a reason.
                    </Trans>
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  {isUpdatingAccess && (
                    <Loader2 className="text-muted-foreground size-4 animate-spin" />
                  )}
                  <Select
                    value={currentState}
                    onValueChange={handleStateSelect}
                    disabled={isUpdatingAccess}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder={t`Select state`} />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_ACCESS_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {platformAccess.spec?.reason && (
                <div className="bg-muted/40 rounded-md border p-3">
                  <Text size="sm" weight="medium" className="mb-1 block">
                    <Trans>Reason</Trans>
                  </Text>
                  <Text textColor="muted" size="sm">
                    {platformAccess.spec.reason}
                  </Text>
                </div>
              )}
            </div>
          ) : (
            <Text textColor="muted" size="sm">
              <Trans>No platform access record exists for this user yet.</Trans>
            </Text>
          )}
        </SectionCard>

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
