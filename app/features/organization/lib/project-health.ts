import type { OrgIssue } from './org-issues';

/**
 * One line per project for the overview's Projects card (#770): its health,
 * what it runs, and how many issues it has. Pure; the component renders it.
 */

/** One data source for a project: still loading, failed (with the HTTP status if known), or loaded. */
export type SourceState<T> =
  { status: 'loading' } | { status: 'error'; statusCode?: number } | { status: 'ok'; value: T };

export interface ProjectHealthInput {
  name: string;
  /** Workload and Instance counts; `undefined` when the compute plugin isn't installed. */
  compute?: SourceState<{ workloads: number; instances: number }>;
  /** Load balancer count. */
  network: SourceState<{ loadBalancers: number }>;
}

export type ProjectHealthStatus = 'loading' | 'unread' | 'issues' | 'healthy';

export interface ProjectResources {
  workloads?: number;
  instances?: number;
  loadBalancers?: number;
}

export interface ProjectHealthRow {
  name: string;
  status: ProjectHealthStatus;
  /** For a project with issues: the worst of them, for the dot and count colour. */
  severity?: 'danger' | 'warning';
  /** Danger and warning issues; low-priority ones don't count, as on the strip. */
  issueCount: number;
  /** Counts from the sources that loaded; a source that didn't load leaves its fields out. */
  resources: ProjectResources;
  /** For an unread project: the HTTP status of the first failure, when known. */
  statusCode?: number;
}

const sources = (input: ProjectHealthInput): SourceState<unknown>[] =>
  input.compute ? [input.compute, input.network] : [input.network];

const resourcesOf = (input: ProjectHealthInput): ProjectResources => ({
  ...(input.compute?.status === 'ok' && {
    workloads: input.compute.value.workloads,
    instances: input.compute.value.instances,
  }),
  ...(input.network.status === 'ok' && { loadBalancers: input.network.value.loadBalancers }),
});

/**
 * Known issues always show, even when some data didn't load. Without issues,
 * a project is only "healthy" once every source loaded: a failed source makes
 * it unread, and one still loading keeps it loading.
 */
function toStatus(input: ProjectHealthInput, issueCount: number): ProjectHealthStatus {
  if (issueCount > 0) return 'issues';
  const all = sources(input);
  if (all.some((source) => source.status === 'error')) return 'unread';
  if (all.some((source) => source.status === 'loading')) return 'loading';
  return 'healthy';
}

const firstStatusCode = (input: ProjectHealthInput): number | undefined =>
  sources(input).flatMap((source) =>
    source.status === 'error' && source.statusCode !== undefined ? [source.statusCode] : []
  )[0];

/** One row per project, in the order given (the organization's project list). */
export function summarizeProjectHealth(
  projects: readonly ProjectHealthInput[],
  issues: readonly OrgIssue[]
): ProjectHealthRow[] {
  const counted = issues.filter((issue) => issue.severity !== 'low');
  return projects.map((input): ProjectHealthRow => {
    const own = counted.filter((issue) => issue.project === input.name);
    const status = toStatus(input, own.length);
    const statusCode = status === 'unread' ? firstStatusCode(input) : undefined;
    return {
      name: input.name,
      status,
      ...(status === 'issues' && {
        severity: own.some((issue) => issue.severity === 'danger') ? 'danger' : 'warning',
      }),
      issueCount: own.length,
      resources: resourcesOf(input),
      ...(statusCode !== undefined && { statusCode }),
    };
  });
}
