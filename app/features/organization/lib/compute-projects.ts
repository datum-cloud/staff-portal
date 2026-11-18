import type { ProjectCompute } from '../hooks/use-org-compute-status';
import type { OrgIssue } from './org-issues';

/**
 * Compute health by project, for the dialog the overview's compute tiles open
 * (#835). Pure; the component does the rendering.
 */

/** `empty`: the project loaded but has no workloads or instances. */
export type ComputeProjectStatus = 'loading' | 'error' | 'problems' | 'healthy' | 'empty';

export interface ProblemCount {
  /** Resources with a danger or warning issue. */
  problems: number;
  total: number;
}

export interface ComputeProjectRow {
  name: string;
  status: ComputeProjectStatus;
  /** For a project with problems: the worst of them, for the status colour. */
  severity?: 'danger' | 'warning';
  workloads: ProblemCount;
  instances: ProblemCount;
}

const STATUS_ORDER: Readonly<Record<ComputeProjectStatus, number>> = {
  problems: 0,
  loading: 1,
  error: 2,
  healthy: 3,
  empty: 4,
};

/** Problem count per project for one area; low-priority issues don't count, as on the tile. */
const problemsByProject = (
  issues: readonly OrgIssue[],
  area: 'workloads' | 'instances'
): ReadonlyMap<string, number> =>
  issues
    .filter((issue) => issue.area === area && issue.severity !== 'low' && issue.project)
    .reduce(
      (counts, issue) =>
        counts.set(issue.project ?? '', (counts.get(issue.project ?? '') ?? 0) + 1),
      new Map<string, number>()
    );

const toStatus = (project: ProjectCompute, problems: number): ComputeProjectStatus => {
  if (project.isError) return 'error';
  if (!project.compute) return 'loading';
  if (problems > 0) return 'problems';
  const { workloads, instances } = project.compute;
  return workloads.length === 0 && instances.length === 0 ? 'empty' : 'healthy';
};

/**
 * One row per project. Problem counts come from the same issues as the tile
 * and the Needs attention list, so the numbers always match. Projects with
 * problems come first (most first), then loading, failed, healthy, and ones
 * with no compute at all; ties keep the project list's order.
 */
export function summarizeComputeProjects(
  projects: ReadonlyMap<string, ProjectCompute>,
  issues: readonly OrgIssue[]
): ComputeProjectRow[] {
  const workloadProblems = problemsByProject(issues, 'workloads');
  const instanceProblems = problemsByProject(issues, 'instances');
  const withDanger = new Set(
    issues
      .filter(
        (issue) =>
          (issue.area === 'workloads' || issue.area === 'instances') && issue.severity === 'danger'
      )
      .map((issue) => issue.project)
  );

  const rows = [...projects].map(([name, project]): ComputeProjectRow => {
    const workloads = workloadProblems.get(name) ?? 0;
    const instances = instanceProblems.get(name) ?? 0;
    const status = toStatus(project, workloads + instances);
    return {
      name,
      status,
      ...(status === 'problems' && { severity: withDanger.has(name) ? 'danger' : 'warning' }),
      workloads: { problems: workloads, total: project.compute?.workloads.length ?? 0 },
      instances: { problems: instances, total: project.compute?.instances.length ?? 0 },
    };
  });

  const problemTotal = (row: ComputeProjectRow) => row.workloads.problems + row.instances.problems;
  // `sort` is stable, so equal rows keep the project list's order.
  return [...rows].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.status === 'problems' ? problemTotal(b) - problemTotal(a) : 0)
  );
}

/** Rows whose project name contains the query, ignoring case. */
export function filterComputeProjects(
  rows: readonly ComputeProjectRow[],
  query: string
): ComputeProjectRow[] {
  const needle = query.trim().toLowerCase();
  return needle ? rows.filter((row) => row.name.toLowerCase().includes(needle)) : [...rows];
}

export interface ComputeProjectCounts {
  total: number;
  problems: number;
  loading: number;
  unread: number;
}

/** How many projects are in each state, for the dialog's header. */
export function countComputeProjects(rows: readonly ComputeProjectRow[]): ComputeProjectCounts {
  const count = (status: ComputeProjectStatus) =>
    rows.filter((row) => row.status === status).length;
  return {
    total: rows.length,
    problems: count('problems'),
    loading: count('loading'),
    unread: count('error'),
  };
}
