import { BadgeState } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
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
import { format, isToday } from 'date-fns';
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

type EventType = 'note' | 'email' | 'org' | 'group' | 'access' | 'signup';

type TimelineEvent = {
  id: string;
  type: EventType;
  /** ISO timestamp driving sort + day grouping. */
  timestamp: string;
  title: React.ReactNode;
  /** Optional detail card rendered under the head (notes, emails). */
  body?: React.ReactNode;
};

/** Dot icon per event type — mirrors the Pencil design's colour families. */
const DOT: Record<EventType, { icon: LucideIcon; className: string }> = {
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

/** Which event types each filter chip reveals. */
const FILTERS: { key: string; label: React.ReactNode; types: EventType[] | null }[] = [
  { key: 'all', label: <Trans>All</Trans>, types: null },
  { key: 'notes', label: <Trans>Notes</Trans>, types: ['note'] },
  { key: 'emails', label: <Trans>Emails</Trans>, types: ['email'] },
  { key: 'orgs', label: <Trans>Organizations</Trans>, types: ['org'] },
  { key: 'groups', label: <Trans>Contact groups</Trans>, types: ['group'] },
  { key: 'account', label: <Trans>Account</Trans>, types: ['access', 'signup'] },
];

const MAX_LENGTH = 1000;

function ts(value?: string): string {
  return value ?? '';
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return isToday(d) ? 'Today' : format(d, 'EEEE, MMM d');
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'h:mm a');
}

type Props = {
  contact?: ComMiloapisNotificationV1Alpha1Contact;
  user?: ComMiloapisIamV1Alpha1User;
  /** Whether the contact is linked to a platform user (gates user-only sources). */
  linked: boolean;
  className?: string;
};

/**
 * Contact timeline (#759): merges notes, emails, org/group joins and account
 * events — all from data the overview already loads — into a day-grouped feed
 * matching the Pencil design, with a working note composer and a newest/oldest
 * sort toggle. Everything else (emails, joins, account events) stays read-only;
 * per-item note edit/delete lands with #760.
 */
export function ContactTimeline({ contact, user, linked, className }: Props) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [sortDir, setSortDir] = React.useState<'desc' | 'asc'>('desc');
  const [content, setContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const trimmed = content.trim();
  const canSubmit = !!contactName && trimmed.length > 0 && trimmed.length <= MAX_LENGTH;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await noteCreateMutation(noteSubject, trimmed);
      setContent('');
      await queryClient.invalidateQueries({
        queryKey: noteQueryKeys.list(noteSubject, { kind: 'core' }),
      });
      toast.success(t`Note added`);
    } catch {
      // Error toast is handled by the axios interceptor.
    } finally {
      setIsSubmitting(false);
    }
  };

  const events = React.useMemo<TimelineEvent[]>(() => {
    const out: TimelineEvent[] = [];

    for (const n of notes) {
      const creatorId = n.spec?.creatorRef?.name;
      const creator = (creatorId && creatorNames[creatorId]) || creatorId || t`someone`;
      out.push({
        id: `note/${n.metadata?.name}`,
        type: 'note',
        timestamp: ts(n.metadata?.creationTimestamp),
        title: <Trans>Note by {creator}</Trans>,
        body: (
          <div className="bg-card rounded-lg border px-3.5 py-3">
            <Text size="sm" className="break-words whitespace-pre-wrap">
              {n.spec?.content}
            </Text>
          </div>
        ),
      });
    }

    for (const e of emailData?.items ?? []) {
      const subject = e.status?.subject || e.spec?.templateRef?.name || t`Email`;
      const template = e.spec?.templateRef?.name;
      const to = e.status?.emailAddress || email;
      const delivered = e.status?.conditions?.some(
        (c) => c.type === 'Delivered' && c.status === 'True'
      );
      out.push({
        id: `email/${e.metadata?.namespace}/${e.metadata?.name}`,
        type: 'email',
        timestamp: ts(e.metadata?.creationTimestamp),
        title: <Trans>Email sent · “{subject}”</Trans>,
        body: (
          <div className="bg-card flex items-center gap-2 rounded-lg border px-3.5 py-2.5">
            <Text size="sm" textColor="muted" className="min-w-0 flex-1 truncate">
              {template ? `${template} · ${to}` : to}
            </Text>
            {delivered ? (
              <BadgeState state="success" message={t`Delivered`} className="shrink-0" />
            ) : null}
          </div>
        ),
      });
    }

    for (const m of orgsQuery.data?.items ?? []) {
      const orgName = m.spec?.organizationRef?.name ?? '';
      const display = m.status?.organization?.displayName || orgName;
      const role = (m.spec?.roles ?? []).map((r) => r.name).filter(Boolean)[0];
      out.push({
        id: `org/${m.metadata?.namespace}/${m.metadata?.name}`,
        type: 'org',
        timestamp: ts(m.metadata?.creationTimestamp),
        title: role ? (
          <Trans>
            Joined {display} as {role}
          </Trans>
        ) : (
          <Trans>Joined {display}</Trans>
        ),
      });
    }

    for (const m of groupsQuery.data?.items ?? []) {
      const groupName =
        m.contactGroup?.spec?.displayName ||
        m.contactGroup?.metadata?.name ||
        m.spec?.contactGroupRef?.name ||
        '';
      out.push({
        id: `group/${m.metadata?.name}`,
        type: 'group',
        timestamp: ts(m.metadata?.creationTimestamp),
        title: <Trans>Added to contact group “{groupName}”</Trans>,
      });
    }

    if (linked && platformAccess?.spec?.state === 'Approved') {
      out.push({
        id: 'access/approved',
        type: 'access',
        timestamp: ts(platformAccess.metadata?.creationTimestamp),
        title: <Trans>Platform access approved</Trans>,
      });
    }

    const signupAt = user?.metadata?.creationTimestamp ?? contact?.metadata?.creationTimestamp;
    if (signupAt) {
      out.push({
        id: 'signup',
        type: 'signup',
        timestamp: ts(signupAt),
        title: linked ? <Trans>Signed up · contact created</Trans> : <Trans>Contact created</Trans>,
      });
    }

    return out;
  }, [
    notes,
    creatorNames,
    emailData,
    orgsQuery.data,
    groupsQuery.data,
    platformAccess,
    linked,
    user,
    contact,
    email,
    t,
  ]);

  const visible = React.useMemo(() => {
    const filter = FILTERS.find((f) => f.key === activeFilter);
    const base = !filter?.types ? events : events.filter((e) => new Set(filter.types).has(e.type));
    return [...base].sort((a, b) =>
      sortDir === 'desc'
        ? b.timestamp.localeCompare(a.timestamp)
        : a.timestamp.localeCompare(b.timestamp)
    );
  }, [events, activeFilter, sortDir]);

  // Group consecutive events by calendar day, following the chosen sort order.
  const groups = React.useMemo(() => {
    const result: { label: string; items: TimelineEvent[] }[] = [];
    for (const e of visible) {
      const label = dayLabel(e.timestamp);
      const last = result[result.length - 1];
      if (last && last.label === label) last.items.push(e);
      else result.push({ label, items: [e] });
    }
    return result;
  }, [visible]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Note composer */}
      <form onSubmit={handleAddNote} className="bg-card flex flex-col gap-3 rounded-xl border p-4">
        <Textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t`Add a note about this contact… (visible to staff only)`}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = f.key === activeFilter;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                'flex items-center rounded-full px-2.5 py-0.5 transition-colors',
                active ? 'bg-foreground' : 'bg-card hover:bg-accent border'
              )}>
              <Text
                size="xs"
                className={cn(
                  'leading-normal font-medium',
                  active ? 'text-background' : 'text-muted-foreground'
                )}>
                {f.label}
              </Text>
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          className="hover:text-foreground text-muted-foreground transition-colors">
          <Text size="xs" className="text-inherit">
            {sortDir === 'desc' ? <Trans>Newest first ↓</Trans> : <Trans>Oldest first ↑</Trans>}
          </Text>
        </button>
      </div>

      {/* Timeline */}
      {isLoading ? (
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
            <div key={group.label} className="flex flex-col gap-1">
              <div className="flex items-center gap-3 py-1">
                <Text size="xs" textColor="muted" className="shrink-0 font-semibold">
                  {group.label}
                </Text>
                <div className="bg-border h-px flex-1" />
              </div>
              {group.items.map((e) => {
                const { icon: Icon, className: dotClass } = DOT[e.type];
                return (
                  <div
                    key={e.id}
                    className={cn('flex gap-3 py-2', e.body ? 'items-start' : 'items-center')}>
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
                          {e.title}
                        </Text>
                        <Text size="xs" textColor="muted" className="shrink-0">
                          {timeLabel(e.timestamp)}
                        </Text>
                      </div>
                      {e.body}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
