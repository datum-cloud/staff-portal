import type { ProjectCompute } from '../hooks/use-org-compute-status';
import {
  countComputeProjects,
  filterComputeProjects,
  summarizeComputeProjects,
} from './compute-projects';
import type { ProjectComputeStatus } from './compute-status';
import type { OrgIssue } from './org-issues';
import { describe, expect, it } from 'vitest';

const loaded = (workloads: number, instances: number): ProjectCompute => ({
  isLoading: false,
  isError: false,
  updatedAt: 1,
  compute: {
    workloads: Array.from({ length: workloads }),
    instances: Array.from({ length: instances }),
    hasMore: false,
  } as unknown as ProjectComputeStatus,
});
const loading: ProjectCompute = { isLoading: true, isError: false, updatedAt: 0 };
const failed: ProjectCompute = { isLoading: false, isError: true, updatedAt: 0 };

const issue = (
  project: string,
  area: OrgIssue['area'],
  severity: OrgIssue['severity'] = 'danger'
): OrgIssue => ({
  id: `${area}/${project}/${Math.random()}`,
  area,
  kind: area,
  name: 'x',
  project,
  severity,
  reason: 'r',
});

describe('summarizeComputeProjects', () => {
  it('counts problems and totals per project', () => {
    const rows = summarizeComputeProjects(new Map([['api', loaded(4, 11)]]), [
      issue('api', 'workloads'),
      issue('api', 'instances', 'warning'),
      issue('api', 'instances'),
    ]);
    expect(rows).toEqual([
      {
        name: 'api',
        status: 'problems',
        severity: 'danger',
        workloads: { problems: 1, total: 4 },
        instances: { problems: 2, total: 11 },
      },
    ]);
  });

  it('uses warning severity when no problem is a danger', () => {
    const [row] = summarizeComputeProjects(new Map([['api', loaded(1, 1)]]), [
      issue('api', 'instances', 'warning'),
    ]);
    expect(row.severity).toBe('warning');
  });

  it("doesn't count low-priority issues or other areas", () => {
    const [row] = summarizeComputeProjects(new Map([['api', loaded(2, 2)]]), [
      issue('api', 'workloads', 'low'),
      issue('api', 'loadBalancers'),
    ]);
    expect(row.status).toBe('healthy');
    expect(row.workloads.problems).toBe(0);
  });

  it('marks a project with no workloads or instances as empty, sorted last', () => {
    const rows = summarizeComputeProjects(
      new Map([
        ['none', loaded(0, 0)],
        ['some', loaded(1, 1)],
      ]),
      []
    );
    expect(rows.map((r) => [r.name, r.status])).toEqual([
      ['some', 'healthy'],
      ['none', 'empty'],
    ]);
  });

  it('marks loading and failed projects', () => {
    const rows = summarizeComputeProjects(
      new Map([
        ['a', loading],
        ['b', failed],
      ]),
      []
    );
    expect(rows.map((r) => [r.name, r.status])).toEqual([
      ['a', 'loading'],
      ['b', 'error'],
    ]);
  });

  it('sorts problems first (most first), then loading, failed, healthy; ties keep list order', () => {
    const rows = summarizeComputeProjects(
      new Map([
        ['healthy-1', loaded(1, 1)],
        ['few', loaded(3, 3)],
        ['failed', failed],
        ['many', loaded(3, 3)],
        ['loading', loading],
        ['healthy-2', loaded(1, 1)],
      ]),
      [issue('few', 'workloads'), issue('many', 'workloads'), issue('many', 'instances')]
    );
    expect(rows.map((r) => r.name)).toEqual([
      'many',
      'few',
      'loading',
      'failed',
      'healthy-1',
      'healthy-2',
    ]);
  });
});

describe('filterComputeProjects', () => {
  const rows = summarizeComputeProjects(
    new Map([
      ['api-prod', loaded(1, 1)],
      ['web', loaded(1, 1)],
    ]),
    []
  );

  it('matches part of the name, ignoring case and spaces', () => {
    expect(filterComputeProjects(rows, ' API ').map((r) => r.name)).toEqual(['api-prod']);
  });

  it('returns everything for an empty query', () => {
    expect(filterComputeProjects(rows, '')).toHaveLength(2);
  });
});

describe('countComputeProjects', () => {
  it('counts projects by state', () => {
    const rows = summarizeComputeProjects(
      new Map([
        ['a', loaded(1, 1)],
        ['b', loading],
        ['c', loading],
        ['d', failed],
        ['e', loaded(0, 0)],
      ]),
      [issue('a', 'workloads')]
    );
    expect(countComputeProjects(rows)).toEqual({ total: 5, problems: 1, loading: 2, unread: 1 });
  });
});
