import { buildTimelineEvents, dayKey, isTodayKey, type TimelineEvent } from './contact-timeline';
import { describe, expect, it } from 'vitest';

function byId(events: TimelineEvent[], id: string) {
  return events.find((e) => e.id === id);
}

describe('buildTimelineEvents', () => {
  it('returns no events for empty input', () => {
    expect(buildTimelineEvents({})).toEqual([]);
  });

  it('builds a note event with the resolved creator name and content', () => {
    const [event] = buildTimelineEvents({
      notes: [
        {
          metadata: { name: 'n1', creationTimestamp: '2026-01-01T10:00:00Z' },
          spec: { content: 'Called the customer', creatorRef: { name: 'user-1' } },
        },
      ],
      creatorNames: { 'user-1': 'Ada Lovelace' },
    });
    expect(event).toMatchObject({
      id: 'note/n1',
      type: 'note',
      creator: 'Ada Lovelace',
      content: 'Called the customer',
      timestamp: '2026-01-01T10:00:00Z',
    });
  });

  it('falls back to the creator id, then empty, when the name is unresolved', () => {
    const [withId] = buildTimelineEvents({
      notes: [{ metadata: { name: 'n1' }, spec: { creatorRef: { name: 'user-x' } } }],
    });
    const [noId] = buildTimelineEvents({ notes: [{ metadata: { name: 'n2' }, spec: {} }] });
    expect(withId).toMatchObject({ type: 'note', creator: 'user-x' });
    expect(noId).toMatchObject({ type: 'note', creator: '' });
  });

  it('marks an email delivered only on a Delivered/True condition and resolves the recipient', () => {
    const events = buildTimelineEvents({
      recipientEmail: 'fallback@datum.net',
      emails: [
        {
          metadata: { name: 'e1', namespace: 'ns', creationTimestamp: '2026-02-01T09:00:00Z' },
          spec: { templateRef: { name: 'welcome' } },
          status: {
            subject: 'Welcome',
            emailAddress: 'kevin@datum.net',
            conditions: [{ type: 'Delivered', status: 'True' }],
          },
        },
        {
          metadata: { name: 'e2', namespace: 'ns' },
          spec: { templateRef: { name: 'nudge' } },
          status: { conditions: [{ type: 'Delivered', status: 'False' }] },
        },
      ],
    });
    expect(byId(events, 'email/ns/e1')).toMatchObject({
      type: 'email',
      subject: 'Welcome',
      template: 'welcome',
      to: 'kevin@datum.net',
      delivered: true,
    });
    // No status subject/address → subject falls back to template, recipient to the fallback.
    expect(byId(events, 'email/ns/e2')).toMatchObject({
      subject: 'nudge',
      to: 'fallback@datum.net',
      delivered: false,
    });
  });

  it('uses the org display name (falling back to the ref name) and the first role', () => {
    const events = buildTimelineEvents({
      orgs: [
        {
          metadata: { name: 'm1', namespace: 'ns' },
          spec: {
            organizationRef: { name: 'acme' },
            roles: [{ name: 'owner' }, { name: 'editor' }],
          },
          status: { organization: { displayName: 'Acme, Inc' } },
        },
        {
          metadata: { name: 'm2', namespace: 'ns' },
          spec: { organizationRef: { name: 'beta-org' } },
        },
      ],
    });
    expect(byId(events, 'org/ns/m1')).toMatchObject({ org: 'Acme, Inc', role: 'owner' });
    expect(byId(events, 'org/ns/m2')).toMatchObject({ org: 'beta-org', role: undefined });
  });

  it('resolves a group name by displayName › metadata.name › ref name', () => {
    const [display] = buildTimelineEvents({
      groups: [
        {
          metadata: { name: 'gm1' },
          contactGroup: { metadata: { name: 'all-users' }, spec: { displayName: 'All Users' } },
        },
      ],
    });
    const [ref] = buildTimelineEvents({
      groups: [{ metadata: { name: 'gm2' }, spec: { contactGroupRef: { name: 'vips' } } }],
    });
    expect(display).toMatchObject({ type: 'group', group: 'All Users' });
    expect(ref).toMatchObject({ type: 'group', group: 'vips' });
  });

  it('adds the access event only when linked and Approved', () => {
    const base = {
      platformAccessState: 'Approved',
      platformAccessTimestamp: '2026-01-02T00:00:00Z',
    };
    expect(buildTimelineEvents({ ...base, linked: true })).toHaveLength(1);
    expect(buildTimelineEvents({ ...base, linked: false })).toHaveLength(0);
    expect(buildTimelineEvents({ linked: true, platformAccessState: 'Pending' })).toHaveLength(0);
  });

  it('adds a signup event carrying the linked flag', () => {
    const [linked] = buildTimelineEvents({ signupTimestamp: '2026-01-01T00:00:00Z', linked: true });
    const [prospect] = buildTimelineEvents({ signupTimestamp: '2026-01-01T00:00:00Z' });
    expect(linked).toMatchObject({ id: 'signup', type: 'signup', linked: true });
    expect(prospect).toMatchObject({ type: 'signup', linked: false });
  });

  it('merges every source into one list', () => {
    const events = buildTimelineEvents({
      notes: [{ metadata: { name: 'n1' }, spec: {} }],
      emails: [{ metadata: { name: 'e1', namespace: 'ns' } }],
      orgs: [
        { metadata: { name: 'm1', namespace: 'ns' }, spec: { organizationRef: { name: 'o' } } },
      ],
      groups: [{ metadata: { name: 'g1' }, spec: { contactGroupRef: { name: 'grp' } } }],
      linked: true,
      platformAccessState: 'Approved',
      signupTimestamp: '2026-01-01T00:00:00Z',
    });
    expect(events.map((e) => e.type)).toEqual([
      'note',
      'email',
      'org',
      'group',
      'access',
      'signup',
    ]);
  });
});

describe('dayKey', () => {
  it('produces a stable date key and empty string for invalid input', () => {
    expect(dayKey('2026-10-01T23:30:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dayKey('')).toBe('');
    expect(dayKey('not-a-date')).toBe('');
  });
});

describe('isTodayKey', () => {
  it('matches only today, and never the empty key', () => {
    expect(isTodayKey(dayKey(new Date().toISOString()))).toBe(true);
    expect(isTodayKey(dayKey('2000-01-01T00:00:00Z'))).toBe(false);
    expect(isTodayKey('')).toBe(false);
  });
});
