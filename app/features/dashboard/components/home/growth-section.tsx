import { usePlatformGrowth } from '@/features/dashboard/hooks/use-platform-home';
import { orgRoutes, projectRoutes, userRoutes } from '@/utils/config/routes.config';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Trans } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface GrowthCardProps {
  title: ReactNode;
  href: string;
  last7d?: number;
  last30d?: number;
  truncated?: boolean;
  isLoading: boolean;
  isError: boolean;
}

function formatCount(count: number | undefined, truncated?: boolean) {
  if (count == null) return '—';
  return `${count.toLocaleString()}${truncated ? '+' : ''}`;
}

function GrowthCard({
  title,
  href,
  last7d,
  last30d,
  truncated,
  isLoading,
  isError,
}: GrowthCardProps) {
  return (
    <Link
      to={href}
      className="focus-visible:ring-ring block h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none">
      <Card size="sm" className="hover:bg-muted/30 h-full w-full transition-colors">
        <CardContent className="flex min-w-0 flex-col gap-2">
          <div className="flex h-4 items-center justify-between gap-2">
            <Text size="xs" weight="medium" textColor="muted">
              {title}
            </Text>
            <Text size="5xs" textColor="muted">
              <Trans>Last 7d</Trans>
            </Text>
          </div>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-16 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </>
          ) : (
            <>
              <Text
                as="div"
                size="2xl"
                weight="semibold"
                textColor="default"
                className="flex h-8 items-center tabular-nums">
                {isError ? '—' : formatCount(last7d, truncated)}
              </Text>
              <Text size="xs" textColor="muted" className="tabular-nums">
                {isError ? (
                  <Trans>Couldn&apos;t load counts</Trans>
                ) : (
                  <Trans>{formatCount(last30d, truncated)} in the last 30 days</Trans>
                )}
              </Text>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function GrowthSection() {
  const { data, isLoading, isError } = usePlatformGrowth();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 px-1">
        <Text as="h2" size="sm" weight="medium">
          <Trans>Growth</Trans>
        </Text>
        <Text size="xs" textColor="muted">
          <Trans>New sign-ups across the platform, from the audit log.</Trans>
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
        <GrowthCard
          title={<Trans>New users</Trans>}
          href={userRoutes.list()}
          {...data?.users}
          isLoading={isLoading}
          isError={isError}
        />
        <GrowthCard
          title={<Trans>New organizations</Trans>}
          href={orgRoutes.list()}
          {...data?.organizations}
          isLoading={isLoading}
          isError={isError}
        />
        <GrowthCard
          title={<Trans>New projects</Trans>}
          href={projectRoutes.list()}
          {...data?.projects}
          isLoading={isLoading}
          isError={isError}
        />
      </div>
    </section>
  );
}
