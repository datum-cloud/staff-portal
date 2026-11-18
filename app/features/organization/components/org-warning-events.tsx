import { useOrgWarningEvents } from '../hooks/use-org-warning-events';
import type { WarningGroup } from '../lib/warning-events';
import { DateTime } from '@/components/date';
import { SectionCard } from '@/features/milo';
import { useShowMore } from '@/hooks';
import { orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Plural, Trans } from '@lingui/react/macro';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

/** Groups shown before "Show all". */
const VISIBLE_GROUPS = 10;

function GroupRow({ group }: { group: WarningGroup }) {
  return (
    <TableRow title={group.message}>
      <TableCell className="tabular-nums">×{group.count}</TableCell>
      <TableCell className="text-warning font-mono">{group.reason || '—'}</TableCell>
      <TableCell className="max-w-md truncate font-mono" title={`${group.kind}/${group.name}`}>
        {group.kind}/{group.name}
      </TableCell>
      <TableCell>
        {group.project ? (
          <Link
            to={projectRoutes.activity.events(group.project)}
            className="text-muted-foreground hover:text-foreground hover:underline">
            {group.project}
          </Link>
        ) : (
          <Text as="span" size="sm" textColor="muted">
            <Trans>Organization</Trans>
          </Text>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {group.lastSeen ? <DateTime date={group.lastSeen} variant="relative" /> : '—'}
      </TableCell>
    </TableRow>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <TableRow key={index} aria-hidden>
          {Array.from({ length: 5 }).map((__, cell) => (
            <TableCell key={cell}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * What to say when there are no warnings to list. Only claims "none" when
 * every source was read.
 */
function EmptyLine({ nothingRead, someUnread }: { nothingRead: boolean; someUnread: boolean }) {
  if (nothingRead) {
    return (
      <Text size="sm" textColor="muted">
        <Trans>Couldn&apos;t load warning events.</Trans>
      </Text>
    );
  }
  return (
    <Text size="sm" textColor="muted">
      {someUnread ? (
        <Trans>No warning events in the last 24 hours in what could be read.</Trans>
      ) : (
        <Trans>No warning events in the last 24 hours.</Trans>
      )}
    </Text>
  );
}

/**
 * The organization overview's Warning events (#769): the last 24 hours of
 * Warning events across the organization and its projects, grouped by object
 * and reason. Hover a row for the latest message.
 */
export function OrgWarningEvents({ orgName, className }: { orgName: string; className?: string }) {
  const { groups, isLoading, projectCount, loadingProjects, unreadProjects, orgUnread, isError } =
    useOrgWarningEvents(orgName);

  const loading = isLoading || loadingProjects > 0;
  const { shown, hidden, showAll } = useShowMore(groups, VISIBLE_GROUPS);
  const unread = unreadProjects.length;
  // Every source failed: one "couldn't load" line says it all.
  const nothingRead = isError || (orgUnread && unread === projectCount);

  return (
    <section className={className}>
      <SectionCard
        title={
          <span className="flex items-baseline gap-2">
            <Trans>Warning events</Trans>
            <Text as="span" size="sm" textColor="muted" weight="normal">
              <Trans>Last 24 hours</Trans>
            </Text>
          </span>
        }
        action={
          <Link
            to={orgRoutes.activity.events(orgName)}
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline">
            <Trans>All events</Trans>
            <Icon icon={ArrowRight} size={14} aria-hidden />
          </Link>
        }>
        <div className="flex flex-col gap-2">
          {groups.length > 0 || loading ? (
            <div className="overflow-hidden rounded-md border" aria-busy={loading}>
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-20">
                      <Trans>Count</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Reason</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Object</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Project</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Last seen</Trans>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((group) => (
                    <GroupRow key={group.id} group={group} />
                  ))}
                  {loading && <SkeletonRows count={groups.length > 0 ? 1 : 3} />}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyLine nothingRead={nothingRead} someUnread={orgUnread || unread > 0} />
          )}

          {hidden > 0 && (
            <Button
              type="quaternary"
              theme="borderless"
              size="small"
              className="self-start"
              onClick={showAll}>
              <Trans>Show all {groups.length}</Trans>
            </Button>
          )}

          {!nothingRead && (unread > 0 || orgUnread) && (
            <Text size="xs" textColor="muted">
              {orgUnread && (
                <Trans>The organization&apos;s own events couldn&apos;t be read.</Trans>
              )}{' '}
              {unread > 0 && (
                <Plural
                  value={unread}
                  one="# project's events couldn't be read, so this list may be incomplete."
                  other="# projects' events couldn't be read, so this list may be incomplete."
                />
              )}
            </Text>
          )}
        </div>
      </SectionCard>
    </section>
  );
}
