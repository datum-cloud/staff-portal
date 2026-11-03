import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { ChevronDown, CircleCheck, CircleHelp, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface AttentionBannerShellProps {
  /** Accessible name for the banner's region. */
  label: string;
  /** Shows a placeholder header while nothing has been found yet. */
  isLoading: boolean;
  /** How many things need attention. */
  total: number;
  /** Muted line beside "All clear". */
  clearSummary?: ReactNode;
  /** Muted line beside the count, e.g. "2 past-due invoices · card expiry". */
  issueSummary?: ReactNode;
  /**
   * Set when nothing was found but some checks couldn't run: replaces "All
   * clear", which would claim more than is known.
   */
  incomplete?: ReactNode;
  defaultExpanded?: boolean;
  /** The expanded list, shown under the header while there are issues. */
  children: ReactNode;
}

/**
 * "All clear", or a count of what needs a person that expands into the
 * detail. Used by the platform home and the billing account dashboard.
 */
export function AttentionBannerShell({
  label,
  isLoading,
  total,
  clearSummary,
  issueSummary,
  incomplete,
  defaultExpanded = false,
  children,
}: AttentionBannerShellProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section aria-label={label} className="bg-card border-border overflow-hidden rounded-xl border">
      <div className="flex h-12 items-center gap-3 px-4">
        {total === 0 && isLoading ? (
          <>
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-4 w-56 rounded" />
          </>
        ) : total === 0 ? (
          <>
            <Icon
              icon={incomplete ? CircleHelp : CircleCheck}
              size={16}
              className={cn('shrink-0', incomplete ? 'text-muted-foreground' : 'text-green-600')}
              aria-hidden
            />
            <Text size="sm" weight="medium" className="shrink-0">
              {incomplete ?? <Trans>All clear</Trans>}
            </Text>
            {clearSummary ? (
              <Text size="sm" textColor="muted" className="hidden min-w-0 truncate @3xl/main:block">
                {clearSummary}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Icon icon={TriangleAlert} size={16} className="shrink-0 text-amber-500" aria-hidden />
            <Text size="sm" weight="medium" className="shrink-0">
              {total === 1 ? (
                <Trans>1 thing needs attention</Trans>
              ) : (
                <Trans>{total} things need attention</Trans>
              )}
            </Text>
            {issueSummary ? (
              <Text size="sm" textColor="muted" className="hidden min-w-0 truncate @3xl/main:block">
                {issueSummary}
              </Text>
            ) : null}
            <div className="ml-auto shrink-0">
              <Button
                type="quaternary"
                theme="borderless"
                size="xs"
                onClick={() => setExpanded((open) => !open)}
                aria-expanded={expanded}
                icon={
                  <Icon
                    icon={ChevronDown}
                    size={14}
                    className={cn('transition-transform', expanded && 'rotate-180')}
                  />
                }
                iconPosition="right">
                {expanded ? <Trans>Hide</Trans> : <Trans>Show all</Trans>}
              </Button>
            </div>
          </>
        )}
      </div>
      {total > 0 && expanded ? children : null}
    </section>
  );
}
