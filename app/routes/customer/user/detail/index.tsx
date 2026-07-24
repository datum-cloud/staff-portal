import { getUserDetailMetadata, useUserDetailData } from '../shared';
import type { Route } from './+types/index';
import AppActionBar from '@/components/app-actiobar';
import { BadgeState } from '@/components/badge';
import { ButtonCopy } from '@/components/button';
import { DangerZoneCard } from '@/components/danger-zone-card';
import { DateTime } from '@/components/date';
import { DescriptionList } from '@/components/description-list';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { Textarea } from '@datum-cloud/datum-ui/textarea';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import { Globe, Loader2, Mail, MapPin, Shield, ShieldAlert, UserIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useRevalidator } from 'react-router';

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
const REASON_MIN_LENGTH = 5;

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

  const [pendingState, setPendingState] = useState<PlatformAccessState | null>(null);
  const [reason, setReason] = useState('');
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

  // Suspend/Reject capture a reason inline rather than in a modal: a Radix dialog
  // opened from the Select's onValueChange leaves `pointer-events: none` stuck on
  // <body> after it closes, freezing the dropdown until a refresh. The Select stays
  // bound to the server's `currentState`, so the pending choice is tracked here and
  // the dropdown reverts on its own if cancelled.
  const handleStateSelect = (value: string) => {
    const next = value as PlatformAccessState;
    if (next === currentState) return;

    if (STATES_REQUIRING_REASON.includes(next)) {
      setPendingState(next);
      setReason('');
      return;
    }

    void applyState(next);
  };

  const confirmPendingState = async () => {
    if (!pendingState || reason.trim().length < REASON_MIN_LENGTH) return;
    try {
      await applyState(pendingState, reason.trim());
      setPendingState(null);
      setReason('');
    } catch {
      // Keep the inline form open so the entered reason isn't lost on a failed request.
    }
  };

  const cancelPendingState = () => {
    setPendingState(null);
    setReason('');
  };

  return (
    <>
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
                    disabled={isUpdatingAccess || pendingState !== null}>
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

              {/* Inline reason capture when moving to Suspended/Rejected */}
              {pendingState && (
                <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <Text size="sm" weight="medium">
                    <Trans>Reason for setting access to {pendingState}</Trans>
                  </Text>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t`Enter a reason (at least ${REASON_MIN_LENGTH} characters)...`}
                    rows={3}
                    autoFocus
                    disabled={isUpdatingAccess}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="tertiary"
                      theme="borderless"
                      size="small"
                      onClick={cancelPendingState}
                      disabled={isUpdatingAccess}>
                      <Trans>Cancel</Trans>
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      loading={isUpdatingAccess}
                      disabled={reason.trim().length < REASON_MIN_LENGTH}
                      onClick={confirmPendingState}>
                      <Trans>Confirm</Trans>
                    </Button>
                  </div>
                </div>
              )}

              {/* Read-only reason — only meaningful while Suspended or Rejected */}
              {!pendingState &&
                (currentState === 'Suspended' || currentState === 'Rejected') &&
                platformAccess.spec?.reason && (
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
