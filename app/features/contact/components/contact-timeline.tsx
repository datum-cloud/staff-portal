import {
  buildTimelineEvents,
  dayKey,
  dayLabel,
  timeLabel,
  type TimelineEvent,
  type TimelineEventType,
} from '../lib/contact-timeline';
import { BadgeState } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { HEADER_STACK_H } from '@/features/milo';
import {
  noteCreateMutation,
  noteQueryKeys,
  useContactGroupMembershipListQuery,
  useNoteCreatorNamesQuery,
  useNotesQuery,
  usePlatformAccessQuery,
  useUserEmailListQuery,
  useUserOrganizationListQuery,
  type NoteSubjectRef,
} from '@/resources/request/client';
import { Button } from '@datum-cloud/datum-ui/button';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Textarea } from '@datum-cloud/datum-ui/textarea';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Trans, useLingui } from '@lingui/react/macro';
import type { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import type { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Mail,
  MessageSquare,
  ShieldCheck,
  StickyNote,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';

/** Dot icon + colour per event type — mirrors the Pencil design's colour families. */
const DOT: Record<TimelineEventType, { icon: LucideIcon; className: string }> = {
  note: {
    icon: StickyNote,
    className: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  },
  email: { icon: Mail, className: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
  org: {
    icon: Building2,
    className: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  },
  group: { icon: Users, className: 'bg-primary/10 text-primary' },
  access: {
    icon: ShieldCheck,
    className: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
  },
  signup: { icon: UserPlus, className: 'bg-muted text-muted-foreground' },
};

/** Which event types each filter chip reveals (`null` = all). */
const FILTERS: { key: string; label: React.ReactNode; types: TimelineEventType[] | null }[] = [
  { key: 'all', label: <Trans>All</Trans>, types: null },
  { key: 'notes', label: <Trans>Notes</Trans>, types: ['note'] },
  { key: 'emails', label: <Trans>Emails</Trans>, types: ['email'] },
  { key: 'orgs', label: <Trans>Organizations</Trans>, types: ['org'] },
  { key: 'groups', label: <Trans>Contact groups</Trans>, types: ['group'] },
  { key: 'account', label: <Trans>Account</Trans>, types: ['access', 'signup'] },
];

const MAX_LENGTH = 1000;
/** How many events to show before "Show older activity", and per reveal. */
const INITIAL_COUNT = 12;
const LOAD_BATCH = 12;

/**
 * Fetches everything the timeline merges (shared query keys with the overview,
 * so React Query dedupes) and derives the pure event list.
 */
function useContactTimelineEvents(
  contact: ComMiloapisNotificationV1Alpha1Contact | undefined,
  user: ComMiloapisIamV1Alpha1User | undefined,
  linked: boolean
) {
  const contactName = contact?.metadata?.name ?? '';
  const namespace = contact?.metadata?.namespace ?? '';
  const email = contact?.spec?.email ?? '';
  const userId = linked ? (user?.metadata?.name ?? '') : '';

  const noteSubject: NoteSubjectRef = {
    apiGroup: 'notification.miloapis.com',
    kind: 'Contact',
    name: contactName,
    namespace,
  };

  const notesQuery = useNotesQuery(noteSubject);
  const notes = React.useMemo(() => notesQuery.data?.items ?? [], [notesQuery.data]);
  const creatorIds = React.useMemo(
    () => [
      ...new Set(notes.map((n) => n.spec?.creatorRef?.name).filter((id): id is string => !!id)),
    ],
    [notes]
  );
  const { data: creatorNames = {} } = useNoteCreatorNamesQuery(creatorIds);

  const { data: emailData, isLoading: emailsLoading } = useUserEmailListQuery(userId, email, {
    enabled: linked && !!email,
  });
  const orgsQuery = useUserOrganizationListQuery(userId);
  const groupsQuery = useContactGroupMembershipListQuery(contactName);
  const { data: platformAccess, isLoading: accessLoading } = usePlatformAccessQuery(userId);

  const isLoading =
    notesQuery.isLoading ||
    orgsQuery.isLoading ||
    groupsQuery.isLoading ||
    emailsLoading ||
    accessLoading;

  const events = React.useMemo(
    () =>
      buildTimelineEvents({
        notes,
        creatorNames,
        emails: emailData?.items,
        orgs: orgsQuery.data?.items,
        groups: groupsQuery.data?.items,
        recipientEmail: email,
        platformAccessState: platformAccess?.spec?.state,
        platformAccessTimestamp: platformAccess?.metadata?.creationTimestamp,
        signupTimestamp: user?.metadata?.creationTimestamp ?? contact?.metadata?.creationTimestamp,
        linked,
      }),
    [
      notes,
      creatorNames,
      emailData,
      orgsQuery.data,
      groupsQuery.data,
      platformAccess,
      user,
      contact,
      email,
      linked,
    ]
  );

  return { events, isLoading, noteSubject };
}

/** Note composer — the only write surface on the timeline (#759). */
function NoteComposer({ subject }: { subject: NoteSubjectRef }) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [content, setContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const trimmed = content.trim();
  const canSubmit = !!subject.name && trimmed.length > 0 && trimmed.length <= MAX_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await noteCreateMutation(subject, trimmed);
      setContent('');
      await queryClient.invalidateQueries({
        queryKey: noteQueryKeys.list(subject, { kind: 'core' }),
      });
      toast.success(t`Note added`);
    } catch {
      // Error toast is handled by the axios interceptor.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <Textarea
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t`Add a note about this contact… (visible to staff only)`}
        aria-label={t`Add a note`}
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <Text size="xs" textColor={content.length > MAX_LENGTH ? 'destructive' : 'muted'}>
          {content.length} / {MAX_LENGTH}
        </Text>
        <Button htmlType="submit" disabled={!canSubmit || isSubmitting} loading={isSubmitting}>
          <Trans>Add note</Trans>
        </Button>
      </div>
    </form>
  );
}

type FiltersProps = {
  active: string;
  onChange: (key: string) => void;
  sortDir: 'desc' | 'asc';
  onToggleSort: () => void;
};

function TimelineFilters({ active, onChange, sortDir, onToggleSort }: FiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((f) => {
        const isActive = f.key === active;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            className={cn(
              'flex items-center rounded-full px-2.5 py-0.5 transition-colors',
              isActive ? 'bg-foreground' : 'bg-card hover:bg-accent border'
            )}>
            <Text
              size="xs"
              className={cn(
                'leading-normal font-medium',
                isActive ? 'text-background' : 'text-muted-foreground'
              )}>
              {f.label}
            </Text>
          </button>
        );
      })}
      <div className="flex-1" />
      <button
        type="button"
        onClick={onToggleSort}
        className="hover:text-foreground text-muted-foreground transition-colors">
        <Text size="xs" className="text-inherit">
          {sortDir === 'desc' ? <Trans>Newest first ↓</Trans> : <Trans>Oldest first ↑</Trans>}
        </Text>
      </button>
    </div>
  );
}

/** Renders one timeline event: a coloured dot, a title + time head, and an optional detail card. */
function TimelineItem({ event }: { event: TimelineEvent }) {
  const { t } = useLingui();
  const { icon: Icon, className: dotClass } = DOT[event.type];

  let title: React.ReactNode = null;
  let body: React.ReactNode = null;

  switch (event.type) {
    case 'note':
      title = <Trans>Note by {event.creator || t`someone`}</Trans>;
      body = (
        <div className="bg-card rounded-lg border px-3.5 py-3">
          <Text size="sm" className="break-words whitespace-pre-wrap">
            {event.content}
          </Text>
        </div>
      );
      break;
    case 'email': {
      const subject = event.subject || t`Email`;
      title = <Trans>Email sent · “{subject}”</Trans>;
      body = (
        <div className="bg-card flex items-center gap-2 rounded-lg border px-3.5 py-2.5">
          <Text size="sm" textColor="muted" className="min-w-0 flex-1 truncate">
            {event.template ? `${event.template} · ${event.to}` : event.to}
          </Text>
          {event.delivered ? (
            <BadgeState state="success" message={t`Delivered`} className="shrink-0" />
          ) : null}
        </div>
      );
      break;
    }
    case 'org':
      title = event.role ? (
        <Trans>
          Joined {event.org} as {event.role}
        </Trans>
      ) : (
        <Trans>Joined {event.org}</Trans>
      );
      break;
    case 'group':
      title = <Trans>Added to contact group “{event.group}”</Trans>;
      break;
    case 'access':
      title = <Trans>Platform access approved</Trans>;
      break;
    case 'signup':
      title = event.linked ? (
        <Trans>Signed up · contact created</Trans>
      ) : (
        <Trans>Contact created</Trans>
      );
      break;
  }

  return (
    <div className={cn('flex gap-3 py-2', body ? 'items-start' : 'items-center')}>
      <div
        className={cn(
          'flex size-[30px] shrink-0 items-center justify-center rounded-full',
          dotClass
        )}>
        <Icon className="size-3.5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <Text size="sm" weight="medium" className="min-w-0 flex-1 truncate">
            {title}
          </Text>
          <Text size="xs" textColor="muted" className="shrink-0">
            {timeLabel(event.timestamp)}
          </Text>
        </div>
        {body}
      </div>
    </div>
  );
}

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
  const { events, isLoading, noteSubject } = useContactTimelineEvents(contact, user, linked);
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [sortDir, setSortDir] = React.useState<'desc' | 'asc'>('desc');

  const visible = React.useMemo(() => {
    const types = FILTERS.find((f) => f.key === activeFilter)?.types;
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
                  {group.label}
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
