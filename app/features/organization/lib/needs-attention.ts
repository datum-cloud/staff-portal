import type { AreaState } from '../hooks/use-org-issues';
import type { IssueArea, OrgIssue } from './org-issues';

/**
 * The organization overview's "Needs attention" list (#768): issues from
 * `useOrgIssues` grouped into rows and filtered by tab. Pure; the component
 * does the rendering.
 */

export const ATTENTION_TABS = ['all', 'compute', 'network', 'quota'] as const;
export type AttentionTab = (typeof ATTENTION_TABS)[number];

/** Which areas each tab shows. */
export const TAB_AREAS: Readonly<Record<Exclude<AttentionTab, 'all'>, readonly IssueArea[]>> = {
  compute: ['workloads', 'instances'],
  network: ['loadBalancers', 'domains', 'dnsZones'],
  quota: ['quota'],
};

/** The tab an area's issues live in, e.g. for a health-strip tile to open. */
export function tabForArea(area: IssueArea): Exclude<AttentionTab, 'all'> {
  if (TAB_AREAS.compute.includes(area)) return 'compute';
  if (TAB_AREAS.network.includes(area)) return 'network';
  return 'quota';
}

export interface AttentionRow {
  issue: OrgIssue;
  /** For a workload row: its failing instances, nested under it. */
  instances: OrgIssue[];
}

const workloadKey = (project: string | undefined, workload: string) =>
  `${project ?? ''}/${workload}`;

/**
 * One row per issue, keeping the sorted order, except that an instance whose
 * workload also has an issue is nested under that workload's row instead of
 * getting its own. An instance whose workload is fine stays a row of its own.
 */
export function buildAttentionRows(issues: readonly OrgIssue[]): AttentionRow[] {
  const workloads = new Set(
    issues
      .filter((issue) => issue.area === 'workloads')
      .map((issue) => workloadKey(issue.project, issue.name))
  );
  const nested = (issue: OrgIssue) =>
    issue.area === 'instances' &&
    Boolean(issue.workloadName) &&
    workloads.has(workloadKey(issue.project, issue.workloadName ?? ''));

  return issues
    .filter((issue) => !nested(issue))
    .map((issue) => ({
      issue,
      instances:
        issue.area === 'workloads'
          ? issues.filter(
              (other) =>
                nested(other) &&
                workloadKey(other.project, other.workloadName ?? '') ===
                  workloadKey(issue.project, issue.name)
            )
          : [],
    }));
}

export function rowsForTab(rows: readonly AttentionRow[], tab: AttentionTab): AttentionRow[] {
  if (tab === 'all') return [...rows];
  const areas = TAB_AREAS[tab];
  return rows.filter((row) => areas.includes(row.issue.area));
}

/** How many rows each tab shows. */
export function tabCounts(rows: readonly AttentionRow[]): Record<AttentionTab, number> {
  return Object.fromEntries(
    ATTENTION_TABS.map((tab) => [tab, rowsForTab(rows, tab).length])
  ) as Record<AttentionTab, number>;
}

/** What was checked, for the empty state: each enabled area and its total. */
export function checkedTotals(
  areas: Readonly<Record<IssueArea, Pick<AreaState, 'enabled' | 'total'>>>
): { area: IssueArea; total: number }[] {
  const order: IssueArea[] = [
    'workloads',
    'instances',
    'loadBalancers',
    'domains',
    'dnsZones',
    'quota',
  ];
  return order
    .filter((area) => areas[area].enabled)
    .map((area) => ({ area, total: areas[area].total }));
}
