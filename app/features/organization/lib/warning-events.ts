import { realTime } from './org-issues';
import type { IoK8sApiEventsV1Event } from '@openapi/activity.miloapis.com/v1alpha1';

/**
 * The organization overview's Warning events (#769): the last 24 hours of
 * warnings across the organization and its projects, grouped by the object
 * they're about and their reason. Pure; the component does the rendering.
 */

/** One control plane's warnings: the organization's own (no `project`) or a project's. */
export interface WarningEventSource {
  project?: string;
  events: readonly IoK8sApiEventsV1Event[];
}

export interface WarningGroup {
  /** Stable key: project, object and reason. */
  id: string;
  /** Undefined for the organization's own events. */
  project?: string;
  kind: string;
  name: string;
  namespace?: string;
  reason: string;
  /** The most recent event's message. */
  message?: string;
  /** How many times it happened, counting repeats the API folded into one event. */
  count: number;
  /** When it last happened (ISO), if any event had a real timestamp. */
  lastSeen?: string;
}

/** Repeats folded into one event: `series.count` when there is a series, else the legacy count. */
const eventCount = (event: IoK8sApiEventsV1Event): number =>
  event.series?.count ?? event.deprecatedCount ?? 1;

/** The latest real time on an event, in ms. */
const eventTime = (event: IoK8sApiEventsV1Event): number | undefined =>
  [
    event.series?.lastObservedTime,
    event.deprecatedLastTimestamp,
    event.eventTime,
    event.metadata?.creationTimestamp,
  ]
    .map(realTime)
    .filter((time): time is number => time !== undefined)
    .reduce<number | undefined>((latest, time) => Math.max(latest ?? time, time), undefined);

const groupKey = (project: string | undefined, event: IoK8sApiEventsV1Event): string =>
  [
    project ?? '',
    event.regarding?.kind ?? '',
    event.regarding?.namespace ?? '',
    event.regarding?.name ?? '',
    event.reason ?? '',
  ].join('/');

interface Accumulated {
  group: WarningGroup;
  lastSeenMs?: number;
}

const newGroup = (project: string | undefined, event: IoK8sApiEventsV1Event): WarningGroup => ({
  id: groupKey(project, event),
  ...(project && { project }),
  kind: event.regarding?.kind ?? '',
  name: event.regarding?.name ?? '',
  ...(event.regarding?.namespace && { namespace: event.regarding.namespace }),
  reason: event.reason ?? '',
  count: 0,
});

/** Adds one event to its group: the count grows, and the newest event's message and time win. */
const merge = (
  current: Accumulated | undefined,
  project: string | undefined,
  event: IoK8sApiEventsV1Event
): Accumulated => {
  const group = current?.group ?? newGroup(project, event);
  const time = eventTime(event);
  const isNewest = current === undefined || (time ?? -1) >= (current.lastSeenMs ?? -1);
  const lastSeenMs = isNewest ? (time ?? current?.lastSeenMs) : current?.lastSeenMs;
  return {
    lastSeenMs,
    group: {
      ...group,
      count: group.count + eventCount(event),
      ...(isNewest && event.note !== undefined && { message: event.note }),
      ...(lastSeenMs !== undefined && { lastSeen: new Date(lastSeenMs).toISOString() }),
    },
  };
};

/** Newest first; a group with no real time sorts after every group with one. */
const byLastSeen = (a: Accumulated, b: Accumulated): number => {
  if (a.lastSeenMs === undefined || b.lastSeenMs === undefined) {
    return Number(a.lastSeenMs === undefined) - Number(b.lastSeenMs === undefined);
  }
  return b.lastSeenMs - a.lastSeenMs;
};

/**
 * One group per project, object and reason, with the counts added up and the
 * latest message and time kept. Most recently seen first; groups with no real
 * time go last.
 */
export function groupWarningEvents(sources: readonly WarningEventSource[]): WarningGroup[] {
  const groups = sources
    .flatMap((source) => source.events.map((event) => ({ project: source.project, event })))
    .reduce((acc, { project, event }) => {
      const key = groupKey(project, event);
      return acc.set(key, merge(acc.get(key), project, event));
    }, new Map<string, Accumulated>());

  return [...groups.values()].sort(byLastSeen).map((entry) => entry.group);
}
