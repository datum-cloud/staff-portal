import { useOrgRecentChanges } from '../hooks/use-org-recent-changes';
import type { ChangeRow } from '../lib/recent-changes';
import { OverviewCardLink, OverviewCardTitle, OverviewEmptyState } from './overview-card';
import { DateTime } from '@/components/date';
import { SectionCard } from '@/features/milo';
import { ENTITY_ICONS, STATUS_ICONS } from '@/utils/config/icons.config';
import { orgRoutes } from '@/utils/config/routes.config';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Plural, Trans } from '@lingui/react/macro';
import type { ReactNode } from 'react';

function verbLabel(verb: string): ReactNode {
  switch (verb) {
    case 'create':
      return <Trans>created</Trans>;
    case 'update':
      return <Trans>updated</Trans>;
    case 'patch':
      return <Trans>patched</Trans>;
    case 'delete':
    case 'deletecollection':
      return <Trans>deleted</Trans>;
    default:
      return verb;
  }
}

function ChangeItem({ change }: { change: ChangeRow }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="flex min-w-0 flex-1 flex-col">
        <Text as="span" size="sm" weight="medium" className="truncate">
          {change.actor} {verbLabel(change.verb)}
        </Text>
        <Text
          as="span"
          size="xs"
          textColor="muted"
          className="truncate font-mono"
          title={change.project}>
          {[change.resource, change.name].filter(Boolean).join(' ')}
        </Text>
      </span>
      {change.time && (
        <Text as="span" size="xs" textColor="muted" className="shrink-0">
          <DateTime date={change.time} variant="relative" />
        </Text>
      )}
    </li>
  );
}

/**
 * The organization overview's "What changed" (#770): the newest changes in
 * the last 24 hours across the organization's audit log and its projects'.
 * Only says "no changes" when every audit log was read.
 */
export function OrgRecentChanges({ orgName, className }: { orgName: string; className?: string }) {
  const { changes, isLoading, projectCount, loadingProjects, unreadProjects, orgUnread, isError } =
    useOrgRecentChanges(orgName);

  const loading = isLoading || loadingProjects > 0;
  const unread = unreadProjects.length;
  const nothingRead = isError || (orgUnread && unread === projectCount);

  return (
    <section className={className}>
      <SectionCard
        title={
          <OverviewCardTitle title={<Trans>What changed</Trans>} hint={<Trans>Last 24h</Trans>} />
        }
        action={
          <OverviewCardLink to={orgRoutes.activity.auditLogs(orgName)}>
            <Trans>Audit logs</Trans>
          </OverviewCardLink>
        }>
        <div className="flex flex-col gap-1">
          {changes.length > 0 && (
            <ul className="flex flex-col">
              {changes.map((change) => (
                <ChangeItem key={change.id} change={change} />
              ))}
            </ul>
          )}

          {loading ? (
            changes.length === 0 ? (
              <div className="flex flex-col gap-3 py-1" aria-busy="true">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-full rounded-md" />
                ))}
              </div>
            ) : (
              // Newer changes from projects still loading may yet come in above.
              <Text size="xs" textColor="muted" aria-busy="true">
                <Trans>Still checking…</Trans>
              </Text>
            )
          ) : changes.length === 0 ? (
            nothingRead ? (
              <OverviewEmptyState
                icon={STATUS_ICONS.error}
                title={<Trans>Couldn&apos;t load recent changes</Trans>}
              />
            ) : orgUnread || unread > 0 ? (
              <OverviewEmptyState
                icon={STATUS_ICONS.warning}
                title={<Trans>No changes found</Trans>}>
                <Trans>Nothing in the last 24 hours in what could be read.</Trans>
              </OverviewEmptyState>
            ) : (
              <OverviewEmptyState icon={ENTITY_ICONS.activity} title={<Trans>No changes</Trans>}>
                <Trans>Nothing was changed in the last 24 hours.</Trans>
              </OverviewEmptyState>
            )
          ) : null}

          {!loading && !nothingRead && (unread > 0 || orgUnread) && (
            <Text size="xs" textColor="muted">
              {orgUnread && (
                <Trans>The organization&apos;s own audit log couldn&apos;t be read.</Trans>
              )}{' '}
              {unread > 0 && (
                <Plural
                  value={unread}
                  one="# project's audit log couldn't be read."
                  other="# projects' audit logs couldn't be read."
                />
              )}
            </Text>
          )}
        </div>
      </SectionCard>
    </section>
  );
}
