import { realTime, type IssueArea, type OrgIssue } from './org-issues';

/**
 * The organization overview's health strip (#767): the overall verdict and one
 * status line per tile, from `useOrgIssues`. Pure; copy lives in the component.
 */

/** `checking` stands in for Healthy until every area has loaded. */
export type Verdict = 'degraded' | 'warnings' | 'healthy' | 'checking';

/** The parts of an area's state the strip reads (a subset of `AreaState`). */
export interface AreaStatusInput {
  total: number;
  issues: number;
  low: number;
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  unreadProjects: readonly string[];
}

export interface VerdictSummary {
  verdict: Verdict;
  /** Danger and warning issues; low-priority ones are counted separately. */
  issueCount: number;
  lowCount: number;
  /** Distinct projects with an issue (organization-level issues aren't a project). */
  projectCount: number;
  /** When the oldest and newest timed issues started. */
  oldest?: string;
  newest?: string;
  /** Areas that couldn't be fully checked, in display order. */
  unchecked: IssueArea[];
  /** Projects any area couldn't read. */
  unreadProjects: string[];
}

const AREA_ORDER: readonly IssueArea[] = [
  'workloads',
  'instances',
  'loadBalancers',
  'domains',
  'dnsZones',
  'quota',
];

const isUnchecked = (state: AreaStatusInput) =>
  state.enabled && (state.isError || state.unreadProjects.length > 0);

/**
 * Degraded with any danger issue, Warnings with any warning or anything left
 * unchecked, else Healthy. Low-priority issues never change it, and it says
 * Checking instead of Healthy while an area is still loading.
 */
export function summarizeVerdict(
  issues: readonly OrgIssue[],
  areas: Readonly<Record<IssueArea, AreaStatusInput>>
): VerdictSummary {
  const counted = issues.filter((issue) => issue.severity !== 'low');
  const starts = counted
    .map((issue) => realTime(issue.since))
    .filter((time): time is number => time !== undefined);

  const states = AREA_ORDER.map((area) => [area, areas[area]] as const);
  const unchecked = states.filter(([, state]) => isUnchecked(state)).map(([area]) => area);
  const unreadProjects = [
    ...new Set(states.flatMap(([, state]) => (state.enabled ? state.unreadProjects : []))),
  ];
  const loading = states.some(([, state]) => state.enabled && state.isLoading);

  const verdict: Verdict = counted.some((issue) => issue.severity === 'danger')
    ? 'degraded'
    : counted.length > 0 || unchecked.length > 0
      ? 'warnings'
      : loading
        ? 'checking'
        : 'healthy';

  return {
    verdict,
    issueCount: counted.length,
    lowCount: issues.length - counted.length,
    projectCount: new Set(counted.map((issue) => issue.project).filter(Boolean)).size,
    ...(starts.length > 0 && {
      oldest: new Date(Math.min(...starts)).toISOString(),
      newest: new Date(Math.max(...starts)).toISOString(),
    }),
    unchecked,
    unreadProjects,
  };
}

export type TileTone = 'danger' | 'warning' | 'neutral' | 'success' | 'muted';

export type TileLine =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'problems'; count: number }
  | { kind: 'unread'; count: number }
  | { kind: 'longPending'; count: number }
  | { kind: 'clear' }
  | { kind: 'empty' };

export interface TileStatus {
  tone: TileTone;
  line: TileLine;
}

/**
 * One tile's status line. Problems outrank an unread project, which outranks
 * long-pending items; a tile that couldn't load says so instead of a count.
 */
export function tileStatus(
  area: IssueArea,
  issues: readonly OrgIssue[],
  state: AreaStatusInput
): TileStatus {
  if (state.isError) return { tone: 'danger', line: { kind: 'error' } };
  if (state.isLoading && state.total === 0) return { tone: 'muted', line: { kind: 'loading' } };

  if (state.issues > 0) {
    const danger = issues.some((issue) => issue.area === area && issue.severity === 'danger');
    return {
      tone: danger ? 'danger' : 'warning',
      line: { kind: 'problems', count: state.issues },
    };
  }
  if (state.unreadProjects.length > 0) {
    return { tone: 'warning', line: { kind: 'unread', count: state.unreadProjects.length } };
  }
  if (state.low > 0) return { tone: 'neutral', line: { kind: 'longPending', count: state.low } };
  if (state.total === 0) return { tone: 'muted', line: { kind: 'empty' } };
  return { tone: 'success', line: { kind: 'clear' } };
}
