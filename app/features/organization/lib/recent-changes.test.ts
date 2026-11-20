import { recentChanges } from './recent-changes';
import type { IoK8sApiserverPkgApisAuditV1Event } from '@openapi/activity.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

const at = (minutesAgo: number) =>
  new Date(Date.UTC(2026, 10, 19, 12, 0) - minutesAgo * 60_000).toISOString();

let nextId = 0;
const entry = (
  over: Partial<IoK8sApiserverPkgApisAuditV1Event> & { minutesAgo?: number } = {}
): IoK8sApiserverPkgApisAuditV1Event => {
  const { minutesAgo = 0, ...rest } = over;
  return {
    auditID: `audit-${nextId++}`,
    level: 'RequestResponse',
    stage: 'ResponseComplete',
    requestURI: '/apis/x',
    verb: 'update',
    user: { username: 'michael@example.com' },
    objectRef: { resource: 'httpproxies', name: 'docs-proxy' },
    requestReceivedTimestamp: at(minutesAgo),
    responseStatus: { code: 200 },
    ...rest,
  };
};

describe('recentChanges', () => {
  it('shapes an entry into actor, verb, readable kind and name', () => {
    const [row] = recentChanges([{ project: 'p1', events: [entry({ minutesAgo: 14 })] }]);
    expect(row).toMatchObject({
      project: 'p1',
      actor: 'michael@example.com',
      verb: 'update',
      resource: 'HTTP proxy',
      name: 'docs-proxy',
      time: at(14),
    });
  });

  it('merges sources newest first and keeps only the newest five', () => {
    const rows = recentChanges([
      { events: [entry({ minutesAgo: 30 }), entry({ minutesAgo: 1 })] },
      {
        project: 'p1',
        events: [10, 20, 40, 50].map((minutesAgo) => entry({ minutesAgo })),
      },
    ]);
    expect(rows.map((r) => r.time)).toEqual([at(1), at(10), at(20), at(30), at(40)]);
    expect(rows[0].project).toBeUndefined();
  });

  it('drops requests that failed', () => {
    const rows = recentChanges([
      { events: [entry({ responseStatus: { code: 403 } }), entry({ minutesAgo: 5 })] },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].time).toBe(at(5));
  });

  it('counts an entry seen twice once', () => {
    const shared = entry();
    expect(recentChanges([{ events: [shared] }, { project: 'p1', events: [shared] }])).toHaveLength(
      1
    );
  });

  it('puts entries with no time last', () => {
    const rows = recentChanges([
      { events: [entry({ requestReceivedTimestamp: undefined }), entry({ minutesAgo: 60 })] },
    ]);
    expect(rows[0].time).toBe(at(60));
    expect(rows[1].time).toBeUndefined();
  });
});
