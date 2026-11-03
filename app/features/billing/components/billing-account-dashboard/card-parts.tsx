import { DateTime } from '@/components/date';
import { EmptyState } from '@/components/empty-state';
import type { InvoiceFrequency } from '@/modules/billing/billing-cycle';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { t } from '@lingui/core/macro';
import { ArrowRight, CircleAlert } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

/** Shared pieces for the dashboard's section and table cards. */

/**
 * Dashboard sections the banner's fix-it links scroll to. The cards that
 * render these sections set the matching `id` with `SectionAnchor`.
 */
export const BILLING_ACCOUNT_SECTION_IDS = {
  invoices: 'invoices',
  paymentTerms: 'payment-terms',
  contract: 'contract',
  offer: 'offer',
} as const;

export const frequencyLabel = (frequency: InvoiceFrequency): string => {
  switch (frequency) {
    case 'Quarterly':
      return t`Quarterly`;
    case 'Annual':
      return t`Annual`;
    default:
      return t`Monthly`;
  }
};

/**
 * A date inside a line of text. `DateTime` sets its own `text-sm`, which
 * reads larger or smaller than the text around it; this inherits that size.
 * The tooltip is always the detailed one: UTC, local time, relative and
 * timestamp.
 */
export function InlineDate(props: Omit<ComponentProps<typeof DateTime>, 'className' | 'tooltip'>) {
  return (
    <DateTime {...props} tooltip="detailed" className="text-[length:inherit] leading-[inherit]" />
  );
}

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

/**
 * A card body's loading, error and empty states, then its content. Errors
 * and empty states use `EmptyState`, like the rest of the portal.
 */
export function CardQueryState({
  isLoading,
  isError,
  isEmpty = false,
  skeleton,
  error,
  empty,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  /** Shown while loading, in the shape of the content. */
  skeleton: ReactNode;
  /** What failed, e.g. "Couldn't load invoices". */
  error: ReactNode;
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (isLoading) return <>{skeleton}</>;
  if (isError) return <EmptyState size="sm" icon={CircleAlert} title={error} />;
  if (isEmpty) return <EmptyState size="sm" title={empty} />;
  return <>{children}</>;
}

/** A short note inside a card, e.g. "No daily usage recorded for this meter". */
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
    <div className={cn('bg-foreground/10 h-1.5 w-full overflow-hidden rounded-full', className)}>
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
