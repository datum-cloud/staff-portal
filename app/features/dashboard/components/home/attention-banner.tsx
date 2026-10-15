import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans } from '@lingui/react/macro';
import { ChevronDown, ChevronRight, CircleCheck, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

export interface AttentionItem {
  key: string;
  count: number;
  label: ReactNode;
  href: string;
}

interface AttentionBannerProps {
  items: AttentionItem[];
  isLoading: boolean;
}

/**
 * Platform counterpart of cloud-portal's project health banner: "All clear"
 * when nothing needs a person, else a count of what does, expandable into one
 * row per kind of work with a link to where it's done.
 */
export function AttentionBanner({ items, isLoading }: AttentionBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const active = items.filter((i) => i.count > 0);
  const total = active.reduce((sum, i) => sum + i.count, 0);

  return (
    <section
      aria-label="Platform attention"
      className="bg-card border-border overflow-hidden rounded-xl border">
      <div className="flex h-12 items-center gap-3 px-4">
        {isLoading ? (
          <>
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-4 w-56 rounded" />
          </>
        ) : total === 0 ? (
          <>
            <Icon icon={CircleCheck} size={16} className="shrink-0 text-green-600" aria-hidden />
            <Text size="sm" weight="medium">
              <Trans>All clear</Trans>
            </Text>
            <Text size="sm" textColor="muted" className="hidden truncate @3xl/main:block">
              <Trans>No pending approvals, fraud reviews, or quota limits need attention.</Trans>
            </Text>
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
            <Text size="sm" textColor="muted" className="hidden min-w-0 truncate @3xl/main:block">
              {active.map((i, idx) => (
                <span key={i.key}>
                  {idx > 0 && ' · '}
                  {i.count} {i.label}
                </span>
              ))}
            </Text>
            <div className="ml-auto shrink-0">
              <Button
                type="quaternary"
                theme="borderless"
                size="xs"
                onClick={() => setExpanded((e) => !e)}
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
      {expanded && active.length > 0 && (
        <div className="border-border flex flex-col border-t p-1.5">
          {active.map((i) => (
            <Link
              key={i.key}
              to={i.href}
              className="hover:bg-accent flex h-9 items-center gap-2 rounded-md px-2.5 text-sm">
              <span className="font-medium tabular-nums">{i.count}</span>
              <span className="text-muted-foreground min-w-0 flex-1 truncate">{i.label}</span>
              <Icon icon={ChevronRight} size={14} className="text-icon-quaternary" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
