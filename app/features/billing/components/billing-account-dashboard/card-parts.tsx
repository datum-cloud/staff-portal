import type { InvoiceFrequency } from '@/modules/billing/billing-cycle';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

/** Shared pieces for the dashboard's section and table cards. */

export const frequencyLabel = (frequency: InvoiceFrequency | undefined): string => {
  switch (frequency) {
    case 'Quarterly':
      return t`Quarterly`;
    case 'Annual':
      return t`Annual`;
    default:
      return t`Monthly`;
  }
};

/** A card header's "go somewhere" link, e.g. "Open usage dashboard →". */
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <LinkButton
      type="quaternary"
      theme="borderless"
      size="small"
      href={href}
      icon={<Icon icon={ArrowRight} size={14} />}
      iconPosition="right">
      {children}
    </LinkButton>
  );
}

/** Title plus a muted subtitle line, for cards whose header has no description slot. */
export function CardHeading({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <span className="flex flex-col gap-1">
      <span>{title}</span>
      {subtitle ? (
        <Text as="span" size="sm" textColor="muted" weight="normal">
          {subtitle}
        </Text>
      ) : null}
    </span>
  );
}

/** Empty, error and unavailable states inside a card. */
export function CardMessage({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Text as="p" size="sm" textColor="muted" className={cn('py-2', className)}>
      {children}
    </Text>
  );
}

/** Placeholder rows while a table's data loads. */
export function TableRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-8 w-full rounded" />
      ))}
    </div>
  );
}

/** A thin bar showing `value` as a share of `max`. */
export function ShareBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn('bg-muted h-1.5 w-full overflow-hidden rounded-full', className)}>
      <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Wraps a card so the Actions menu and fix-it buttons can scroll to it. */
export function SectionAnchor({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-4">
      {children}
    </div>
  );
}

/**
 * The nested table frame `TableCard` draws, for a `TableCard` with
 * `framed={false}` that puts other content above its table.
 */
export function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="dark:border-border w-full min-w-0 overflow-hidden rounded-sm border border-[#efefed]">
      {children}
    </div>
  );
}
