import { BadgeState } from '@/components/badge';
import { DateTime } from '@/components/date';
import { EmptyState } from '@/components/empty-state';
import { extractTemplateName, getEmailCondition } from '@/features/email';
import { SectionCard } from '@/features/milo';
import { useUserEmailListQuery } from '@/resources/request/client';
import { routes } from '@/utils/config/routes.config';
import { startCase } from '@/utils/helpers';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans, useLingui } from '@lingui/react/macro';
import { Mail } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

type Props = {
  /** The contact's linked user id, or empty for a prospect (matched by email alone). */
  userId: string;
  /** The contact's email address. */
  email: string;
  /** Target for the "View all" link — the contact's Emails sent tab. */
  viewAllHref?: string;
  className?: string;
};

/** Newest first, so the card shows the most recent emails. */
const byNewest = (
  a: { metadata?: { creationTimestamp?: string } },
  b: { metadata?: { creationTimestamp?: string } }
) =>
  new Date(b.metadata?.creationTimestamp ?? 0).getTime() -
  new Date(a.metadata?.creationTimestamp ?? 0).getTime();

const MAX_ROWS = 5;

/**
 * Read-only "Emails sent" card (#784): the contact's most recent emails, with the
 * full list on the Emails sent tab. Shows for prospects too, matched on the email
 * address. Shares `useUserEmailListQuery` with the summary strip so the counts agree.
 */
export function ContactEmailsCard({ userId, email, viewAllHref, className }: Props) {
  const { t } = useLingui();
  const query = useUserEmailListQuery(userId, email, { enabled: !!email || !!userId });
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const recent = useMemo(() => [...items].sort(byNewest).slice(0, MAX_ROWS), [items]);

  const statusLabel: Record<string, string> = {
    true: t`Delivered`,
    false: t`Failed`,
    unknown: t`Pending`,
  };

  return (
    <SectionCard
      className={className}
      title={<Trans>Email Activity</Trans>}
      action={
        viewAllHref && items.length > MAX_ROWS ? (
          <Link to={viewAllHref} className="text-muted-foreground hover:text-foreground text-sm">
            <Trans>View all</Trans>
          </Link>
        ) : undefined
      }>
      {query.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={<Trans>No email activity</Trans>}
          description={<Trans>No emails have been sent to this contact yet.</Trans>}
        />
      ) : (
        <ul className="divide-y">
          {recent.map((emailItem) => {
            const namespace = emailItem.metadata?.namespace ?? '';
            const name = emailItem.metadata?.name ?? '';
            const subject = emailItem.status?.subject;
            const templateName = extractTemplateName(emailItem.spec?.templateRef?.name);
            const condition = getEmailCondition(emailItem);
            const status = condition?.status?.toLowerCase() ?? '';
            return (
              <li
                key={`${namespace}/${name}`}
                className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    to={routes.emailActivityDetail(namespace, name)}
                    className="truncate text-sm">
                    {subject || t`(no subject)`}
                  </Link>
                  <Text size="xs" textColor="muted" className="truncate">
                    {templateName} · <DateTime date={emailItem.metadata?.creationTimestamp} />
                  </Text>
                </div>
                <BadgeState
                  state={status}
                  message={statusLabel[status] ?? startCase(condition?.reason ?? '')}
                />
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
