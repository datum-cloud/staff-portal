import type { IssueArea, OrgIssue } from './org-issues';
import { summarizeVerdict, tileStatus, type AreaStatusInput } from './org-verdict';
import { describe, expect, it } from 'vitest';

const area = (over: Partial<AreaStatusInput> = {}): AreaStatusInput => ({
  total: 5,
  issues: 0,
  low: 0,
  enabled: true,
  isLoading: false,
  isError: false,
  unreadProjects: [],
  ...over,
});

const allAreas = (
  over: Partial<Record<IssueArea, Partial<AreaStatusInput>>> = {}
): Record<IssueArea, AreaStatusInput> => ({
  workloads: area(over.workloads),
  instances: area(over.instances),
  loadBalancers: area(over.loadBalancers),
  domains: area(over.domains),
  dnsZones: area(over.dnsZones),
  quota: area(over.quota),
});

const issue = (over: Partial<OrgIssue>): OrgIssue => ({
  id: over.name ?? 'x',
  area: 'instances',
  kind: 'Instance',
  name: 'x',
  project: 'p1',
  severity: 'warning',
  reason: 'r',
  ...over,
});

describe('summarizeVerdict', () => {
  it('is Degraded with a danger issue, counting projects and the time range', () => {
    const summary = summarizeVerdict(
      [
        issue({ name: 'a', severity: 'danger', project: 'p1', since: '2026-11-10T00:00:00Z' }),
        issue({ name: 'b', project: 'p2', since: '2026-11-01T00:00:00Z' }),
        issue({ name: 'c', project: undefined, area: 'quota' }),
        issue({ name: 'd', severity: 'low', project: 'p3', since: '2026-01-01T00:00:00Z' }),
      ],
      allAreas()
    );
    expect(summary).toMatchObject({
      verdict: 'degraded',
      issueCount: 3,
      lowCount: 1,
      projectCount: 2,
      oldest: '2026-11-01T00:00:00.000Z',
      newest: '2026-11-10T00:00:00.000Z',
      unchecked: [],
    });
  });

  it('is Warnings with only warnings', () => {
    expect(summarizeVerdict([issue({})], allAreas()).verdict).toBe('warnings');
  });

  it('stays Healthy with only low-priority issues', () => {
    const summary = summarizeVerdict([issue({ severity: 'low' })], allAreas());
    expect(summary.verdict).toBe('healthy');
    expect(summary.lowCount).toBe(1);
  });

  it('never says Healthy when something could not be checked, and names it', () => {
    const summary = summarizeVerdict(
      [],
      allAreas({ dnsZones: { isError: true }, workloads: { unreadProjects: ['p9'] } })
    );
    expect(summary.verdict).toBe('warnings');
    expect(summary.unchecked).toEqual(['dnsZones']);
    expect(summary.unreadProjects).toEqual(['p9']);
  });

  it('says Checking instead of Healthy while an area is loading', () => {
    expect(summarizeVerdict([], allAreas({ domains: { isLoading: true } })).verdict).toBe(
      'checking'
    );
  });

  it('ignores compute areas when the compute plugin is off', () => {
    const summary = summarizeVerdict(
      [],
      allAreas({
        workloads: { enabled: false, isError: true, isLoading: true },
        instances: { enabled: false, unreadProjects: ['p1'] },
      })
    );
    expect(summary.verdict).toBe('healthy');
    expect(summary.unchecked).toEqual([]);
  });
});

describe('tileStatus', () => {
  it('shows danger problems in red and warning-only problems in amber', () => {
    expect(tileStatus('instances', [issue({ severity: 'danger' })], area({ issues: 1 }))).toEqual({
      tone: 'danger',
      line: { kind: 'problems', count: 1 },
    });
    expect(tileStatus('instances', [issue({})], area({ issues: 1 }))).toEqual({
      tone: 'warning',
      line: { kind: 'problems', count: 1 },
    });
  });

  it('marks only its own tile when its source failed', () => {
    expect(tileStatus('dnsZones', [], area({ isError: true }))).toEqual({
      tone: 'danger',
      line: { kind: 'error' },
    });
  });

  it('falls back to unread projects, then long-pending, then all clear or none', () => {
    expect(tileStatus('domains', [], area({ unreadProjects: ['p1', 'p2'] })).line).toEqual({
      kind: 'unread',
      count: 2,
    });
    expect(tileStatus('domains', [], area({ low: 2 }))).toEqual({
      tone: 'neutral',
      line: { kind: 'longPending', count: 2 },
    });
    expect(tileStatus('domains', [], area())).toEqual({ tone: 'success', line: { kind: 'clear' } });
    expect(tileStatus('domains', [], area({ total: 0 })).line).toEqual({ kind: 'empty' });
  });

  it('shows loading only until the first data arrives', () => {
    expect(tileStatus('domains', [], area({ isLoading: true, total: 0 })).line).toEqual({
      kind: 'loading',
    });
    expect(tileStatus('domains', [], area({ isLoading: true, total: 3 })).line).toEqual({
      kind: 'clear',
    });
  });
});
