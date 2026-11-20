import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Small pieces the organization overview's cards share, so their headers,
 * links and empty states look the same.
 */

/** A card title with a muted hint beside it, e.g. "Warning events  Last 24 hours". */
export function OverviewCardTitle({ title, hint }: { title: ReactNode; hint?: ReactNode }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      {title}
      {hint && (
        <Text as="span" size="sm" textColor="muted" weight="normal">
          {hint}
        </Text>
      )}
    </span>
  );
}

/** The link in a card's header to the full page, e.g. "All events →". */
export function OverviewCardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-primary inline-flex shrink-0 items-center gap-1 text-sm hover:underline">
      {children}
      <Icon icon={ArrowRight} size={14} aria-hidden />
    </Link>
  );
}

/** A card's centred empty state: an icon, a short title and a line of detail. */
export function OverviewEmptyState({
  icon,
  iconClassName = 'text-muted-foreground',
  title,
  children,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Icon icon={icon} size={24} aria-hidden className={iconClassName} />
      <Text weight="semibold">{title}</Text>
      {children && (
        <Text size="sm" textColor="muted" className="max-w-sm">
          {children}
        </Text>
      )}
    </div>
  );
}
