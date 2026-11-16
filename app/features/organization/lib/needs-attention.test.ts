import {
  buildAttentionRows,
  checkedTotals,
  rowsForTab,
  tabCounts,
  tabForArea,
} from './needs-attention';
import type { IssueArea, OrgIssue } from './org-issues';
import { describe, expect, it } from 'vitest';

const issue = (over: Partial<OrgIssue> & Pick<OrgIssue, 'id' | 'area'>): OrgIssue => ({
  kind: 'Thing',
  name: over.id,
  project: 'p1',
  severity: 'warning',
  reason: 'r',
  ...over,
});

const workload = issue({ id: 'api-gateway', area: 'workloads', severity: 'danger' });
const failing1 = issue({ id: 'api-0', area: 'instances', workloadName: 'api-gateway' });
const failing2 = issue({ id: 'api-1', area: 'instances', workloadName: 'api-gateway' });
const loneInstance = issue({ id: 'worker-0', area: 'instances', workloadName: 'worker' });
const otherProject = issue({
  id: 'api-0-p2',
  area: 'instances',
  project: 'p2',
  workloadName: 'api-gateway',
});
const proxy = issue({ id: 'docs-proxy', area: 'loadBalancers' });
const bucket = issue({ id: 'cpus', area: 'quota' });

describe('buildAttentionRows', () => {
  it("nests an instance under its workload's row and keeps the order", () => {
    const rows = buildAttentionRows([workload, proxy, failing1, failing2, bucket]);
    expect(rows.map((r) => r.issue.id)).toEqual(['api-gateway', 'docs-proxy', 'cpus']);
    expect(rows[0].instances.map((i) => i.id)).toEqual(['api-0', 'api-1']);
  });

  it('keeps an instance as its own row when its workload has no issue', () => {
    const rows = buildAttentionRows([workload, loneInstance]);
    expect(rows.map((r) => r.issue.id)).toEqual(['api-gateway', 'worker-0']);
  });

  it('only nests instances from the same project', () => {
    const rows = buildAttentionRows([workload, otherProject]);
    expect(rows.map((r) => r.issue.id)).toEqual(['api-gateway', 'api-0-p2']);
    expect(rows[0].instances).toEqual([]);
  });
});

describe('tabs', () => {
  const rows = buildAttentionRows([workload, failing1, loneInstance, proxy, bucket]);

  it('filters rows by tab and counts each tab', () => {
    expect(rowsForTab(rows, 'compute').map((r) => r.issue.id)).toEqual(['api-gateway', 'worker-0']);
    expect(rowsForTab(rows, 'network').map((r) => r.issue.id)).toEqual(['docs-proxy']);
    expect(tabCounts(rows)).toEqual({ all: 4, compute: 2, network: 1, quota: 1 });
  });

  it('maps each area to its tab', () => {
    expect(tabForArea('instances')).toBe('compute');
    expect(tabForArea('dnsZones')).toBe('network');
    expect(tabForArea('quota')).toBe('quota');
  });
});

describe('checkedTotals', () => {
  it('lists enabled areas in order with their totals', () => {
    const area = (total: number, enabled = true) => ({ total, enabled });
    const areas: Record<IssueArea, { total: number; enabled: boolean }> = {
      workloads: area(4, false),
      instances: area(11, false),
      loadBalancers: area(5),
      domains: area(6),
      dnsZones: area(4),
      quota: area(12),
    };
    expect(checkedTotals(areas)).toEqual([
      { area: 'loadBalancers', total: 5 },
      { area: 'domains', total: 6 },
      { area: 'dnsZones', total: 4 },
      { area: 'quota', total: 12 },
    ]);
  });
});
