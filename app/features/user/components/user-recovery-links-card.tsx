import { DateTime } from '@/components/date';
import { SectionCard } from '@/features/milo';
import {
  RECOVERY_REASON_ANNOTATION,
  RECOVERY_REQUESTER_ANNOTATION,
  useRecoveryEmailListQuery,
} from '@/resources/request/client';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { MailCheck } from 'lucide-react';

/**
 * The recovery links already sent to this user.
 *
 * There is no PasskeyRegistrationLink to list — the identity apiserver is virtual and keeps
 * nothing — so the history is the notification Emails the create produced, which milo does
 * persist. They carry who asked and why; they never carry the code, and neither does this.
 */
export const UserRecoveryLinksCard = ({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) => {
  const { data, isLoading } = useRecoveryEmailListQuery(userId);

  const sent = [...(data?.items ?? [])].sort((a, b) =>
    (b.metadata?.creationTimestamp ?? '').localeCompare(a.metadata?.creationTimestamp ?? '')
  );

  // The server hit its limit and is offering a continuation token, so this sort ran over a
  // subset. Say so rather than presenting a truncated list as the whole history.
  const isTruncated = Boolean(data?.metadata?.continue);

  return (
    <SectionCard
      className={className}
      title={
        <span className="flex items-center gap-2">
          <MailCheck className="h-4 w-4" />
          <Trans>Passkey Recovery Links</Trans>
        </span>
      }
      description={<Trans>Links support has emailed to this user&apos;s verified address</Trans>}>
      {isLoading ? (
        <Text textColor="muted" size="sm">
          <Trans>Loading...</Trans>
        </Text>
      ) : sent.length === 0 ? (
        <Text textColor="muted" size="sm">
          <Trans>No recovery links have been sent to this user.</Trans>
        </Text>
      ) : (
        <div className="divide-stepper-line flex flex-col divide-y">
          {isTruncated && (
            <Text textColor="muted" size="sm" className="pb-2">
              <Trans>Showing the most recent {sent.length}; older links exist.</Trans>
            </Text>
          )}
          {sent.map((email) => (
            <div
              key={email.metadata?.name}
              className="flex flex-wrap items-start justify-between gap-2 py-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <Text size="sm" weight="medium">
                  <Trans>
                    Sent by {email.metadata?.annotations?.[RECOVERY_REQUESTER_ANNOTATION] ?? '—'}
                  </Trans>
                </Text>
                <Text textColor="muted" size="sm">
                  {email.metadata?.annotations?.[RECOVERY_REASON_ANNOTATION] ?? '—'}
                </Text>
                <Text textColor="muted" size="sm" className="font-mono text-xs">
                  {email.metadata?.name}
                </Text>
              </div>
              <Text textColor="muted" size="sm">
                <DateTime date={email.metadata?.creationTimestamp} variant="both" />
              </Text>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};
