import { format } from 'date-fns';

/** The kinds of events the contact timeline merges, each with its own dot + copy. */
export type TimelineEventType = 'note' | 'email' | 'org' | 'group' | 'access' | 'signup';

interface BaseEvent {
  /** Stable React key, unique across types. */
  id: string;
  /** ISO timestamp driving sort + day grouping (`''` when unknown). */
  timestamp: string;
}

/**
 * A timeline entry as **pure data** — no JSX. The renderer ({@link ContactTimeline})
 * turns each into a row, which keeps this logic testable and cheap to recompute.
 */
export type TimelineEvent =
  | (BaseEvent & { type: 'note'; creator: string; content: string })
  | (BaseEvent & {
      type: 'email';
      subject: string;
      template?: string;
      to: string;
      delivered: boolean;
    })
  | (BaseEvent & { type: 'org'; org: string; role?: string })
  | (BaseEvent & { type: 'group'; group: string })
  | (BaseEvent & { type: 'access' })
  | (BaseEvent & { type: 'signup'; linked: boolean });

// Structural shapes — only the fields the builder reads, so callers can pass the
// full generated resources and tests can pass minimal fixtures.
interface TimelineNote {
  metadata?: { name?: string; creationTimestamp?: string };
  spec?: { content?: string; creatorRef?: { name?: string } };
}
interface TimelineEmail {
  metadata?: { name?: string; namespace?: string; creationTimestamp?: string };
  spec?: { templateRef?: { name?: string } };
  status?: {
    subject?: string;
    emailAddress?: string;
    conditions?: { type?: string; status?: string }[];
  };
}
interface TimelineOrgMembership {
  metadata?: { name?: string; namespace?: string; creationTimestamp?: string };
  spec?: { organizationRef?: { name?: string }; roles?: { name?: string }[] };
  status?: { organization?: { displayName?: string } };
}
interface TimelineGroupMembership {
  metadata?: { name?: string; creationTimestamp?: string };
  spec?: { contactGroupRef?: { name?: string } };
  contactGroup?: { metadata?: { name?: string }; spec?: { displayName?: string } };
}

export interface BuildTimelineInput {
  notes?: TimelineNote[];
  /** Resolved note-creator display names, keyed by creator id. */
  creatorNames?: Record<string, string>;
  emails?: TimelineEmail[];
  orgs?: TimelineOrgMembership[];
  groups?: TimelineGroupMembership[];
  /** Fallback recipient for an email with no resolved address. */
  recipientEmail?: string;
  platformAccessState?: string;
  platformAccessTimestamp?: string;
  signupTimestamp?: string;
  linked?: boolean;
}

function ts(value?: string): string {
  return value ?? '';
}

/**
 * Merges the contact's notes, emails, org/group memberships and account events
 * into a flat list of {@link TimelineEvent}s (unsorted — the view orders them).
 * Pure: same input ⇒ same output, no React, no i18n.
 */
export function buildTimelineEvents(input: BuildTimelineInput): TimelineEvent[] {
  const {
    notes = [],
    creatorNames = {},
    emails = [],
    orgs = [],
    groups = [],
    recipientEmail = '',
    platformAccessState,
    platformAccessTimestamp,
    signupTimestamp,
    linked = false,
  } = input;

  const out: TimelineEvent[] = [];

  for (const n of notes) {
    const creatorId = n.spec?.creatorRef?.name;
    out.push({
      id: `note/${n.metadata?.name}`,
      type: 'note',
      timestamp: ts(n.metadata?.creationTimestamp),
      creator: (creatorId && creatorNames[creatorId]) || creatorId || '',
      content: n.spec?.content ?? '',
    });
  }

  for (const e of emails) {
    out.push({
      id: `email/${e.metadata?.namespace}/${e.metadata?.name}`,
      type: 'email',
      timestamp: ts(e.metadata?.creationTimestamp),
      subject: e.status?.subject || e.spec?.templateRef?.name || '',
      template: e.spec?.templateRef?.name,
      to: e.status?.emailAddress || recipientEmail,
      delivered: Boolean(
        e.status?.conditions?.some((c) => c.type === 'Delivered' && c.status === 'True')
      ),
    });
  }

  for (const m of orgs) {
    const orgName = m.spec?.organizationRef?.name ?? '';
    out.push({
      id: `org/${m.metadata?.namespace}/${m.metadata?.name}`,
      type: 'org',
      timestamp: ts(m.metadata?.creationTimestamp),
      org: m.status?.organization?.displayName || orgName,
      role: (m.spec?.roles ?? []).map((r) => r.name).filter(Boolean)[0],
    });
  }

  for (const m of groups) {
    out.push({
      id: `group/${m.metadata?.name}`,
      type: 'group',
      timestamp: ts(m.metadata?.creationTimestamp),
      group:
        m.contactGroup?.spec?.displayName ||
        m.contactGroup?.metadata?.name ||
        m.spec?.contactGroupRef?.name ||
        '',
    });
  }

  if (linked && platformAccessState === 'Approved') {
    out.push({
      id: 'access/approved',
      type: 'access',
      timestamp: ts(platformAccessTimestamp),
    });
  }

  if (signupTimestamp) {
    out.push({ id: 'signup', type: 'signup', timestamp: ts(signupTimestamp), linked });
  }

  return out;
}

/** Stable per-day grouping key (locale-independent), e.g. `2026-10-01`. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
}

/**
 * Day header for a date, e.g. `Thursday, Oct 1`. The "today" case is left to the
 * caller so it can be translated (see {@link isTodayKey}); this stays pure.
 */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'EEEE, MMM d');
}

/** Whether a {@link dayKey} is today's — lets the view show a translated "Today". */
export function isTodayKey(key: string): boolean {
  return key !== '' && key === dayKey(new Date().toISOString());
}

/** Per-event time, e.g. `11:50 AM`. */
export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'h:mm a');
}
