import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * A headline-number tile for dashboard health rows: a small title, a big
 * figure, and a muted line under it. Used by the platform home's health
 * section and the billing account dashboard.
 */
export function StatTile({
  title,
  windowLabel,
  href,
  children,
}: {
  title: ReactNode;
  /** Right-aligned note on the title row, e.g. "Last 24h". */
  windowLabel?: ReactNode;
  /** Makes the whole tile a link. */
  href?: string;
  children: ReactNode;
}) {
  const card = (
    <Card size="sm" className={cn('h-full w-full', href && 'hover:bg-muted/30 transition-colors')}>
      <CardContent className="flex min-w-0 flex-col gap-2">
        <div className="flex h-4 items-center justify-between gap-2">
          <Text size="xs" weight="medium" textColor="muted">
            {title}
          </Text>
          {windowLabel && (
            <Text size="5xs" textColor="muted">
              {windowLabel}
            </Text>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );

  if (!href) return card;
  return (
    <Link
      to={href}
      className="focus-visible:ring-ring block h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none">
      {card}
    </Link>
  );
}

/** Placeholder in the shape of a headline and its detail line. */
export function StatTileSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-20 rounded" />
      <Skeleton className="h-4 w-32 rounded" />
    </>
  );
}

/**
 * The tile's big figure. `icon` sits before it; the figure itself ellipsizes
 * when it's too wide, with the full text on hover.
 */
export function StatTileHeadline({
  icon,
  title,
  className,
  children,
}: {
  icon?: ReactNode;
  /** Hover text, e.g. the full amount; defaults to the children when they're a string. */
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Text
      as="div"
      size="2xl"
      weight="semibold"
      textColor="default"
      className={cn('flex h-8 min-w-0 items-center gap-2 tabular-nums', className)}>
      {icon}
      <span
        className="min-w-0 truncate"
        title={title ?? (typeof children === 'string' ? children : undefined)}>
        {children}
      </span>
    </Text>
  );
}

/** The muted line under the headline. */
export function StatTileDetail({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Text size="xs" textColor="muted" ellipsis className={cn('tabular-nums', className)}>
      {children}
    </Text>
  );
}

/** In place of the headline when there's nothing to show, e.g. "Couldn't load …". */
export function StatTileMessage({ children }: { children: ReactNode }) {
  return (
    <Text size="sm" textColor="muted" className="flex h-8 items-center">
      {children}
    </Text>
  );
}
