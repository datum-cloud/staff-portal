import { groupWarningEvents } from './warning-events';
import type { IoK8sApiEventsV1Event } from '@openapi/activity.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

const at = (minutesAgo: number) =>
  new Date(Date.UTC(2026, 10, 18, 12, 0) - minutesAgo * 60_000).toISOString();

const event = (
  over: Partial<IoK8sApiEventsV1Event> & { minutesAgo?: number }
): IoK8sApiEventsV1Event => {
  const { minutesAgo = 0, ...rest } = over;
  return {
    type: 'Warning',
    reason: 'BackOff',
    note: 'Back-off restarting failed container',
    regarding: { kind: 'Instance', namespace: 'default', name: 'api-0' },
    eventTime: at(minutesAgo),
    ...rest,
  };
};

describe('groupWarningEvents', () => {
  it('groups by project, object and reason, adding up counts', () => {
    const groups = groupWarningEvents([
      {
        project: 'p1',
        events: [
          event({ minutesAgo: 30, series: { count: 5, lastObservedTime: at(20) } }),
          event({ minutesAgo: 10, deprecatedCount: 3 }),
          event({ minutesAgo: 5 }),
        ],
      },
    ]);
    expect(groups).toEqual([
      {
        id: 'p1/Instance/default/api-0/BackOff',
        project: 'p1',
        kind: 'Instance',
        name: 'api-0',
        namespace: 'default',
        reason: 'BackOff',
        message: 'Back-off restarting failed container',
        count: 9,
        lastSeen: at(5),
      },
    ]);
  });

  it('keeps different reasons, objects and projects apart', () => {
    const groups = groupWarningEvents([
      { project: 'p1', events: [event({}), event({ reason: 'Failed' })] },
      { project: 'p2', events: [event({})] },
      { project: 'p1', events: [event({ regarding: { kind: 'Instance', name: 'api-1' } })] },
    ]);
    expect(groups).toHaveLength(4);
  });

  it("marks the organization's own events with no project", () => {
    const [group] = groupWarningEvents([{ events: [event({})] }]);
    expect(group.project).toBeUndefined();
    expect(group.id).toBe('/Instance/default/api-0/BackOff');
  });

  it('keeps the newest message and time, using the latest timestamp on each event', () => {
    const [group] = groupWarningEvents([
      {
        project: 'p1',
        events: [
          event({ minutesAgo: 1, note: 'newest' }),
          event({ minutesAgo: 60, note: 'old', series: { count: 2, lastObservedTime: at(40) } }),
        ],
      },
    ]);
    expect(group.message).toBe('newest');
    expect(group.lastSeen).toBe(at(1));
  });

  it('sorts newest first and puts groups with no real time last', () => {
    const groups = groupWarningEvents([
      {
        project: 'p1',
        events: [
          event({ reason: 'Old', minutesAgo: 120 }),
          event({ reason: 'Never', eventTime: '0001-01-01T00:00:00Z' }),
          event({ reason: 'New', minutesAgo: 1 }),
        ],
      },
    ]);
    expect(groups.map((g) => g.reason)).toEqual(['New', 'Old', 'Never']);
    expect(groups[2].lastSeen).toBeUndefined();
  });
});
