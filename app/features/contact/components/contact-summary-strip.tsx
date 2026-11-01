import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import * as React from 'react';

type StatTileProps = {
  label: React.ReactNode;
  /** The headline value — plain text or a node (e.g. a badge). */
  value: React.ReactNode;
  /** Optional sub-line under the value. */
  hint?: React.ReactNode;
  /** When true, the value + hint are replaced by a skeleton. */
  loading?: boolean;
  className?: string;
};

/**
 * One stat in the contact summary strip: an uppercase label, a prominent value,
 * and an optional muted sub-line. Carries its own padding and a divider border
 * (bottom when stacked, right when in a row) — the last tile drops its border.
 */
export function StatTile({ label, value, hint, loading, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1 px-5 py-3.5',
        'border-b last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0',
        className
      )}>
      <Text size="xs" textColor="muted" className="font-medium tracking-wide uppercase">
        {label}
      </Text>
      {loading ? (
        <Skeleton className="my-1 h-5 w-16" />
      ) : (
        <Text size="xl" className="text-foreground truncate font-semibold">
          {value}
        </Text>
      )}
      {!loading && hint ? (
        <Text size="xs" textColor="muted" className="truncate">
          {hint}
        </Text>
      ) : null}
    </div>
  );
}

type StripProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Strip of {@link StatTile}s on a card surface, divided by borders. Stacks into
 * a column at narrow widths. The caller renders only the tiles that apply
 * (user-only stats are omitted for a prospect).
 */
export function ContactSummaryStrip({ children, className }: StripProps) {
  return (
    <div
      className={cn(
        'bg-card flex flex-col overflow-hidden rounded-xl border',
        'sm:flex-row sm:items-stretch',
        className
      )}>
      {children}
    </div>
  );
}
