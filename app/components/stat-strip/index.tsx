import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * A row of headline stats joined into one bar: an optional lead cell (e.g. a
 * verdict) followed by equal-width items split by dividers. The joined
 * counterpart of `StatTile`; item content reuses `StatTileHeadline`,
 * `StatTileDetail`, `StatTileSkeleton` and `StatTileMessage`.
 *
 * Items size to however many there are. Below the `@3xl/main` container width
 * the lead takes the full row and items wrap two to a row.
 */
export function StatStrip({
  label,
  className,
  children,
}: {
  /** Accessible name for the strip's region. */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        'bg-card border-border flex flex-col overflow-hidden rounded-xl border @3xl/main:flex-row',
        className
      )}>
      {children}
    </section>
  );
}

export type StatStripTone = 'danger' | 'warning' | 'success' | 'neutral';

const LEAD_TONE: Record<StatStripTone, string> = {
  danger: 'bg-destructive/5',
  warning: 'bg-amber-500/5',
  success: 'bg-green-600/5',
  neutral: '',
};

/** The tinted first cell, e.g. an overall verdict. Fixed width on wide screens. */
export function StatStripLead({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: StatStripTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        // No bottom line on narrow screens: the items' top lines draw it.
        'border-border flex flex-col justify-center gap-1 px-4 py-3 @3xl/main:w-72 @3xl/main:shrink-0 @3xl/main:border-r',
        LEAD_TONE[tone],
        className
      )}>
      {children}
    </div>
  );
}

/** Holds the items so they share the remaining width equally. */
export function StatStripItems({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-w-0 flex-1 grid-cols-2 @3xl/main:auto-cols-fr @3xl/main:grid-flow-col @3xl/main:grid-cols-none">
      {children}
    </div>
  );
}

/** One stat in the strip. With `href`, the whole cell is a link and shows an arrow. */
export function StatStripItem({
  title,
  href,
  children,
}: {
  title: ReactNode;
  href?: string;
  children: ReactNode;
}) {
  const body = (
    <div className="flex h-full min-w-0 flex-col gap-2 px-4 py-3">
      <div className="flex h-4 items-center justify-between gap-2">
        <Text size="xs" weight="medium" textColor="muted" ellipsis>
          {title}
        </Text>
        {href && <Icon icon={ArrowRight} size={14} aria-hidden className="text-muted-foreground" />}
      </div>
      {children}
    </div>
  );

  // Dividers: a top line between wrapped rows on narrow screens, a left line
  // between items on wide ones.
  const cell =
    'border-border min-w-0 border-t even:border-l @3xl/main:border-t-0 @3xl/main:border-l @3xl/main:first:border-l-0';

  if (!href) return <div className={cell}>{body}</div>;
  return (
    <Link
      to={href}
      className={cn(
        cell,
        'hover:bg-muted/30 focus-visible:ring-ring block transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset'
      )}>
      {body}
    </Link>
  );
}
