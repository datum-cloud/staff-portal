import { dayKey, dayLabel, isTodayKey, type TimelineEvent } from '../../lib/contact-timeline';
import { NoteComposer } from './note-composer';
import { TIMELINE_FILTERS, TimelineFilters } from './timeline-filters';
import { TimelineItem } from './timeline-item';
import { useContactTimelineEvents } from './use-timeline-events';
import { EmptyState } from '@/components/empty-state';
import { HEADER_STACK_H } from '@/features/milo';
import { Button } from '@datum-cloud/datum-ui/button';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans, useLingui } from '@lingui/react/macro';
import type { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import type { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';
import { MessageSquare } from 'lucide-react';
import * as React from 'react';

/** How many events to show before "Show older activity", and per reveal. */
const INITIAL_COUNT = 12;
const LOAD_BATCH = 12;

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="size-[30px] shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-48 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  contact?: ComMiloapisNotificationV1Alpha1Contact;
  user?: ComMiloapisIamV1Alpha1User;
  /** Whether the contact is linked to a platform user (gates user-only sources). */
  linked: boolean;
  className?: string;
};

/**
 * Contact timeline (#759): a day-grouped feed merged from data the overview
 * already loads, matching the Pencil design — with a working note composer and
 * newest/oldest sort. The feed is capped and extended via "Show older activity".
 * Everything except note create stays read-only; note edit/delete lands with #760.
 */
export function ContactTimeline({ contact, user, linked, className }: Props) {
  const { t } = useLingui();
  const { events, isLoading, noteSubject } = useContactTimelineEvents(contact, user, linked);
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [sortDir, setSortDir] = React.useState<'desc' | 'asc'>('desc');

  const visible = React.useMemo(() => {
    const types = TIMELINE_FILTERS.find((f) => f.key === activeFilter)?.types;
    const base = types ? events.filter((e) => types.includes(e.type)) : events;
    return [...base].sort((a, b) =>
      sortDir === 'desc'
        ? b.timestamp.localeCompare(a.timestamp)
        : a.timestamp.localeCompare(b.timestamp)
    );
  }, [events, activeFilter, sortDir]);

  // Cap the feed so a long history doesn't run off the page; reset on view change
  // (adjust-state-during-render — React's escape hatch, no effect needed).
  const [limit, setLimit] = React.useState(INITIAL_COUNT);
  const viewKey = `${activeFilter}|${sortDir}`;
  const [prevViewKey, setPrevViewKey] = React.useState(viewKey);
  if (viewKey !== prevViewKey) {
    setPrevViewKey(viewKey);
    setLimit(INITIAL_COUNT);
  }
  const hasMore = visible.length > limit;

  // Group consecutive events by calendar day (keyed on a stable date, labelled
  // for display), following the chosen sort order.
  const groups = React.useMemo(() => {
    const result: { key: string; label: string; items: TimelineEvent[] }[] = [];
    for (const e of visible.slice(0, limit)) {
      const key = dayKey(e.timestamp);
      const last = result[result.length - 1];
      if (last && last.key === key) last.items.push(e);
      else result.push({ key, label: dayLabel(e.timestamp), items: [e] });
    }
    return result;
  }, [visible, limit]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <NoteComposer subject={noteSubject} />
      <TimelineFilters
        active={activeFilter}
        onChange={setActiveFilter}
        sortDir={sortDir}
        onToggleSort={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
      />

      {isLoading ? (
        <TimelineSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={<Trans>No activity yet</Trans>}
          description={
            <Trans>Notes, emails, and account history for this contact will appear here.</Trans>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-1">
              <div
                className="bg-card sticky z-10 flex items-center gap-3 py-1.5"
                style={{ top: HEADER_STACK_H }}>
                <Text size="xs" textColor="muted" className="shrink-0 font-semibold">
                  {isTodayKey(group.key) ? t`Today` : group.label}
                </Text>
                <div className="bg-border h-px flex-1" />
              </div>
              {group.items.map((e) => (
                <TimelineItem key={e.id} event={e} />
              ))}
            </div>
          ))}

          {hasMore ? (
            <div className="flex justify-center pt-1">
              <Button
                type="secondary"
                theme="outline"
                size="small"
                onClick={() => setLimit((l) => l + LOAD_BATCH)}>
                <Trans>Show older activity</Trans>
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
