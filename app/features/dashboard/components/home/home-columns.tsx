import { HomeColumn, HomeColumnEmpty, HomeColumnRow, HomeColumnSkeleton } from './home-column';
import { DateTime } from '@/components/date';
import { UserAvatar } from '@/components/user-avatar';
import {
  useRecentCreates,
  useReviewQueue,
  type ReviewItem,
} from '@/features/dashboard/hooks/use-platform-home';
import { useResourceCount } from '@/features/dashboard/hooks/use-resource-count';
import { orgListQuery, userListQuery } from '@/resources/request/client';
import { ENTITY_ICONS } from '@/utils/config/icons.config';
import { fraudRoutes, orgRoutes, userRoutes } from '@/utils/config/routes.config';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import { CircleCheck, Clock } from 'lucide-react';

function formatCount(count: number | undefined) {
  return count == null ? undefined : count.toLocaleString();
}

function RelativeTime({ date }: { date: string }) {
  return (
    <Text size="xs" textColor="muted" className="shrink-0 tabular-nums">
      <DateTime date={date} variant="relative" />
    </Text>
  );
}

export function NewUsersColumn() {
  const { data, isLoading } = useRecentCreates('users');
  const total = useResourceCount({
    queryKey: ['dashboard', 'kpi', 'users'],
    queryFn: () => userListQuery({ limit: 1 }),
  });

  return (
    <HomeColumn
      title={<Trans>New users</Trans>}
      href={userRoutes.list()}
      count={formatCount(total.count)}>
      {isLoading ? (
        <HomeColumnSkeleton />
      ) : !data?.length ? (
        <HomeColumnEmpty icon={ENTITY_ICONS.user} message={<Trans>No sign-ups in 30 days</Trans>} />
      ) : (
        data.map((u) => (
          <HomeColumnRow
            key={u.name}
            to={userRoutes.detail(u.name)}
            icon={
              <UserAvatar
                name={u.displayName}
                avatarUrl={u.avatarUrl}
                className="size-5"
                fallbackClassName="text-2xs"
              />
            }
            label={u.secondary ?? u.displayName}
            meta={<RelativeTime date={u.createdAt} />}
          />
        ))
      )}
    </HomeColumn>
  );
}

export function NewOrgsColumn() {
  const { data, isLoading } = useRecentCreates('organizations');
  const total = useResourceCount({
    queryKey: ['dashboard', 'kpi', 'organizations'],
    queryFn: () => orgListQuery({ limit: 1 }),
  });

  return (
    <HomeColumn
      title={<Trans>New organizations</Trans>}
      href={orgRoutes.list()}
      count={formatCount(total.count)}>
      {isLoading ? (
        <HomeColumnSkeleton />
      ) : !data?.length ? (
        <HomeColumnEmpty
          icon={ENTITY_ICONS.organization}
          message={<Trans>No new organizations in 30 days</Trans>}
        />
      ) : (
        data.map((o) => (
          <HomeColumnRow
            key={o.name}
            to={orgRoutes.detail(o.name)}
            icon={
              <Icon
                icon={ENTITY_ICONS.organization}
                size={14}
                className="text-icon-quaternary"
                aria-hidden
              />
            }
            label={o.displayName}
            meta={<RelativeTime date={o.createdAt} />}
          />
        ))
      )}
    </HomeColumn>
  );
}

function reviewRowProps(item: ReviewItem) {
  if (item.kind === 'fraud') {
    return {
      to: fraudRoutes.evaluations.detail(item.name),
      icon: <Icon icon={ENTITY_ICONS.fraud} size={14} className="text-destructive" aria-hidden />,
      meta: (
        <Badge
          type={item.decision === 'DEACTIVATE' ? 'danger' : 'warning'}
          theme="light"
          className="shrink-0">
          {item.decision === 'DEACTIVATE' ? <Trans>Deactivate</Trans> : <Trans>Review</Trans>}
          {item.score != null && ` · ${item.score.toFixed(2)}`}
        </Badge>
      ),
    };
  }
  return {
    to: userRoutes.detail(item.name),
    icon: <Icon icon={Clock} size={14} className="text-amber-500" aria-hidden />,
    meta: (
      <Badge type="muted" theme="light" className="shrink-0">
        <Trans>Pending access</Trans>
      </Badge>
    ),
  };
}

export function NeedsReviewColumn() {
  const { items, totalCount, isLoading } = useReviewQueue();

  return (
    <HomeColumn
      title={<Trans>Needs review</Trans>}
      href={fraudRoutes.evaluations.list()}
      count={isLoading ? undefined : formatCount(totalCount)}>
      {isLoading ? (
        <HomeColumnSkeleton />
      ) : items.length === 0 ? (
        <HomeColumnEmpty icon={CircleCheck} message={<Trans>Nothing waiting on review</Trans>} />
      ) : (
        items.map((item) => (
          <HomeColumnRow key={item.key} label={item.userDisplay} {...reviewRowProps(item)} />
        ))
      )}
    </HomeColumn>
  );
}
