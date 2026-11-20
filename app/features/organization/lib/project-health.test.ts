import type { OrgIssue } from './org-issues';
import { summarizeProjectHealth, type ProjectHealthInput } from './project-health';
import { describe, expect, it } from 'vitest';

const ok = <T>(value: T) => ({ status: 'ok' as const, value });
const loading = { status: 'loading' as const };
const failed = (statusCode?: number) => ({ status: 'error' as const, statusCode });

const project = (over: Partial<ProjectHealthInput> & Pick<ProjectHealthInput, 'name'>) => ({
  compute: ok({ workloads: 3, instances: 8 }),
  network: ok({ loadBalancers: 2 }),
  ...over,
});

const issue = (project: string, severity: OrgIssue['severity'] = 'danger'): OrgIssue => ({
  id: `${project}/${Math.random()}`,
  area: 'workloads',
  kind: 'Workload',
  name: 'x',
  project,
  severity,
  reason: 'r',
});

describe('summarizeProjectHealth', () => {
  it('counts resources and marks a project with no issues healthy', () => {
    const [row] = summarizeProjectHealth([project({ name: 'a' })], []);
    expect(row).toEqual({
      name: 'a',
      status: 'healthy',
      issueCount: 0,
      resources: { workloads: 3, instances: 8, loadBalancers: 2 },
    });
  });

  it("counts a project's danger and warning issues, not low-priority ones or other projects'", () => {
    const [row] = summarizeProjectHealth(
      [project({ name: 'a' })],
      [issue('a', 'warning'), issue('a', 'warning'), issue('a', 'low'), issue('b')]
    );
    expect(row).toMatchObject({ status: 'issues', severity: 'warning', issueCount: 2 });
  });

  it('uses danger severity when any issue is a danger', () => {
    const [row] = summarizeProjectHealth(
      [project({ name: 'a' })],
      [issue('a', 'warning'), issue('a')]
    );
    expect(row.severity).toBe('danger');
  });

  it('marks a project unread when a source failed, with the first status code', () => {
    const [row] = summarizeProjectHealth(
      [project({ name: 'a', compute: failed(403), network: failed(500) })],
      []
    );
    expect(row).toMatchObject({ status: 'unread', statusCode: 403, resources: {} });
  });

  it('still shows known issues when a source failed', () => {
    const [row] = summarizeProjectHealth(
      [project({ name: 'a', network: failed(403) })],
      [issue('a')]
    );
    expect(row).toMatchObject({ status: 'issues', issueCount: 1 });
    expect(row.resources).toEqual({ workloads: 3, instances: 8 });
  });

  it("doesn't call a project healthy while a source is loading", () => {
    const [row] = summarizeProjectHealth([project({ name: 'a', network: loading })], []);
    expect(row.status).toBe('loading');
  });

  it('leaves out compute when the plugin is not installed', () => {
    const [row] = summarizeProjectHealth([project({ name: 'a', compute: undefined })], []);
    expect(row).toMatchObject({ status: 'healthy', resources: { loadBalancers: 2 } });
  });

  it('keeps the order given', () => {
    const rows = summarizeProjectHealth(
      [project({ name: 'z' }), project({ name: 'a' })],
      [issue('a')]
    );
    expect(rows.map((r) => r.name)).toEqual(['z', 'a']);
  });
});
