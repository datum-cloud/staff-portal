import {
  findCondition,
  toConditions,
  type ComputeCondition,
  type InstanceStatus,
  type ProjectComputeStatus,
  type WorkloadStatus,
} from './compute-status';
import { orgRoutes, projectRoutes } from '@/utils/config/routes.config';
import type { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';
import type {
  ComDatumapisNetworkingV1AlphaDomain,
  ComDatumapisNetworkingV1AlphaHttpProxy,
} from '@openapi/networking.datumapis.com/v1alpha';
import type { ComMiloapisQuotaV1Alpha1AllowanceBucket } from '@openapi/quota.miloapis.com/v1alpha1';

/**
 * The organization overview's issue list (#766): every source turned into one
 * shape, with the severity rules agreed on #764. Pure functions; `now` is passed
 * in so the time-based rules are testable.
 */

export type IssueArea =
  | 'workloads'
  | 'instances'
  | 'loadBalancers'
  | 'domains'
  | 'dnsZones'
  | 'quota';

/** `low` is listed but never changes the verdict. */
export type IssueSeverity = 'danger' | 'warning' | 'low';

export interface OrgIssue {
  /** Stable across refreshes, e.g. `instances/datum-cloud/default/crashing-0`. */
  id: string;
  area: IssueArea;
  /** Human kind for the path, e.g. "Workload". */
  kind: string;
  name: string;
  /** The project, or undefined for an organization-level resource. */
  project?: string;
  severity: IssueSeverity;
  /** The condition's reason, e.g. `ImageUnavailable`. */
  reason: string;
  message?: string;
  /** When the problem started, when known. */
  since?: string;
  /** For an expiring domain: when it expires. */
  expiresAt?: string;
  href?: string;
  /** For an instance: its workload, so the list can nest it. */
  workloadName?: string;
}

/** Waiting states only count after this long. */
export const WAITING_GRACE_MS = 15 * 60 * 1000;
/** Waiting states older than this are low priority. */
export const LONG_PENDING_MS = 7 * 24 * 60 * 60 * 1000;
/** A quota bucket at or above this share of its limit is an issue. */
export const QUOTA_USAGE_THRESHOLD = 0.9;

/** Instance start failures the user must fix; always danger. */
const FAILING_INSTANCE_REASONS = new Set([
  'ImageUnavailable',
  'InstanceCrashing',
  'ConfigurationError',
]);
/** Instances meant to be off. `Stopping` is on its way there. */
const OFF_INSTANCE_REASONS = new Set(['Suspended', 'Stopped', 'Stopping']);

/** `Provisioning`, `InstancesProvisioning`, `Starting`, `SchedulingGatesPresent`, `Pending*`. */
export function isWaitingReason(reason: string | undefined): boolean {
  if (!reason) return false;
  return (
    reason.startsWith('Pending') ||
    reason.endsWith('Provisioning') ||
    reason === 'Starting' ||
    reason === 'SchedulingGatesPresent'
  );
}

// Some conditions report 1970 as their transition time (seen on staging), which
// would read as "57 years ago". Anything before 2000 counts as unknown.
const EARLIEST_REAL_TIME = Date.UTC(2000, 0, 1);

/** A timestamp in ms, or undefined when missing, unparseable or placeholder. */
export function realTime(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) && time >= EARLIEST_REAL_TIME ? time : undefined;
}

/** First real timestamp among the candidates, as an ISO string. */
function firstRealTime(...values: (string | undefined)[]): string | undefined {
  return values.find((value) => realTime(value) !== undefined);
}

/**
 * Severity of something waiting since `since`: hidden during the grace period,
 * a warning after, low priority once long-pending. Unknown age shows as a warning.
 */
export function waitingSeverity(since: string | undefined, now: number): IssueSeverity | null {
  const start = realTime(since);
  if (start === undefined) return 'warning';
  const age = now - start;
  if (age < WAITING_GRACE_MS) return null;
  return age > LONG_PENDING_MS ? 'low' : 'warning';
}

/** The condition that decides "not programmed": `Programmed`, else the first not-True one. */
function blockingCondition(conditions: ComputeCondition[]): ComputeCondition | undefined {
  return findCondition(conditions, 'Programmed') ?? conditions.find((c) => c.status !== 'True');
}

const isProgrammed = (conditions: ComputeCondition[]): boolean =>
  findCondition(conditions, 'Programmed')?.status === 'True';

type IssueBase = Omit<OrgIssue, 'severity' | 'reason' | 'message' | 'since'>;

/** Builds an issue for a resource whose blocking reason may be a waiting state. */
function conditionIssue(
  base: IssueBase,
  reason: string,
  message: string | undefined,
  since: string | undefined,
  now: number,
  otherwise: IssueSeverity
): OrgIssue[] {
  const severity = isWaitingReason(reason) ? waitingSeverity(since, now) : otherwise;
  if (!severity) return [];
  return [
    {
      ...base,
      severity,
      reason,
      ...(message && { message }),
      ...(since && { since }),
    },
  ];
}

// ── Compute ───────────────────────────────

export function instanceIssues(
  project: string,
  instances: readonly InstanceStatus[],
  now: number
): OrgIssue[] {
  return instances.flatMap((instance) => {
    const base: IssueBase = {
      id: `instances/${project}/${instance.namespace}/${instance.name}`,
      area: 'instances',
      kind: 'Instance',
      name: instance.name,
      project,
      ...(instance.href && { href: instance.href }),
      ...(instance.workloadName && { workloadName: instance.workloadName }),
    };
    const since = firstRealTime(instance.since, instance.createdAt);

    // An exit that won't restart: a clean exit is fine, anything else warns.
    const runtime = findCondition(instance.conditions, 'RuntimeReady');
    if (runtime?.status === 'False' && runtime.reason === 'RuntimeExited') {
      if (runtime.message?.includes('(Succeeded)')) return [];
      return conditionIssue(
        base,
        'RuntimeExited',
        runtime.message,
        firstRealTime(runtime.lastTransitionTime, since),
        now,
        'warning'
      );
    }

    if (instance.readiness === 'Ready') return [];
    if (instance.reason && OFF_INSTANCE_REASONS.has(instance.reason)) return [];
    if (instance.reason && FAILING_INSTANCE_REASONS.has(instance.reason)) {
      return conditionIssue(base, instance.reason, instance.message, since, now, 'danger');
    }

    // No Ready condition yet counts as still provisioning.
    const reason = instance.reason ?? 'Provisioning';
    return conditionIssue(base, reason, instance.message, since, now, 'warning');
  });
}

export function workloadIssues(
  project: string,
  workloads: readonly WorkloadStatus[],
  now: number
): OrgIssue[] {
  return workloads.flatMap((workload) => {
    const base: IssueBase = {
      id: `workloads/${project}/${workload.namespace}/${workload.name}`,
      area: 'workloads',
      kind: 'Workload',
      name: workload.name,
      project,
      href: workload.href,
    };
    const available = findCondition(workload.conditions, 'Available');
    const since = firstRealTime(available?.lastTransitionTime, workload.createdAt);

    if (available?.status === 'False') {
      const reason = available.reason ?? 'Unavailable';
      return conditionIssue(base, reason, available.message, since, now, 'danger');
    }
    if (available?.status === 'True' && workload.ready < workload.desired) {
      return [
        {
          ...base,
          severity: 'danger',
          reason: 'Degraded',
          message: `${workload.ready} of ${workload.desired} instances ready`,
          ...(since && { since }),
        },
      ];
    }
    if (!available && workload.desired > 0) {
      return conditionIssue(base, 'Provisioning', undefined, workload.createdAt, now, 'warning');
    }
    return [];
  });
}

// ── Network ───────────────────────────────

export function httpProxyIssues(
  project: string,
  proxies: readonly ComDatumapisNetworkingV1AlphaHttpProxy[],
  now: number
): OrgIssue[] {
  return proxies.flatMap((proxy) => {
    const name = proxy.metadata?.name ?? '';
    const conditions = toConditions(proxy.status?.conditions);
    if (isProgrammed(conditions)) return [];
    const blocking = blockingCondition(conditions);
    return conditionIssue(
      {
        id: `loadBalancers/${project}/${proxy.metadata?.namespace ?? 'default'}/${name}`,
        area: 'loadBalancers',
        kind: 'Load balancer',
        name,
        project,
        href: projectRoutes.edge.detail(project, name),
      },
      blocking?.reason ?? 'PendingProgramming',
      blocking?.message,
      firstRealTime(blocking?.lastTransitionTime, proxy.metadata?.creationTimestamp),
      now,
      'warning'
    );
  });
}

export function dnsZoneIssues(
  project: string,
  zones: readonly ComMiloapisNetworkingDnsV1Alpha1DnsZone[],
  now: number
): OrgIssue[] {
  return zones.flatMap((zone) => {
    const name = zone.metadata?.name ?? '';
    const namespace = zone.metadata?.namespace ?? 'default';
    const conditions = toConditions(zone.status?.conditions);
    if (isProgrammed(conditions)) return [];
    const blocking = blockingCondition(conditions);
    return conditionIssue(
      {
        id: `dnsZones/${project}/${namespace}/${name}`,
        area: 'dnsZones',
        kind: 'DNS zone',
        name,
        project,
        href: projectRoutes.dns.detail(project, namespace, name),
      },
      blocking?.reason ?? 'PendingProgramming',
      blocking?.message,
      firstRealTime(blocking?.lastTransitionTime, zone.metadata?.creationTimestamp),
      now,
      'warning'
    );
  });
}

/** One month ahead in UTC, matching the domain list's "Expires soon" badge. */
function oneMonthAfter(now: number): number {
  const date = new Date(now);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.getTime();
}

export function domainIssues(
  project: string,
  domains: readonly ComDatumapisNetworkingV1AlphaDomain[],
  now: number
): OrgIssue[] {
  return domains.flatMap((domain) => {
    const name = domain.metadata?.name ?? '';
    const namespace = domain.metadata?.namespace ?? 'default';
    const base: IssueBase = {
      id: `domains/${project}/${namespace}/${name}`,
      area: 'domains',
      kind: 'Domain',
      name,
      project,
      href: projectRoutes.domain.detail(project, namespace, name),
    };

    const verified = findCondition(toConditions(domain.status?.conditions), 'Verified');
    const unverified =
      verified?.status === 'False'
        ? conditionIssue(
            base,
            verified.reason ?? 'PendingVerification',
            verified.message,
            firstRealTime(verified.lastTransitionTime, domain.metadata?.creationTimestamp),
            now,
            'warning'
          )
        : [];

    const expiresAt = domain.status?.registration?.expiresAt;
    const expiry = realTime(expiresAt);
    const expiring: OrgIssue[] =
      expiresAt && expiry !== undefined && expiry <= oneMonthAfter(now)
        ? [
            {
              ...base,
              id: `${base.id}/expiry`,
              severity: 'warning',
              reason: expiry <= now ? 'Expired' : 'ExpiringSoon',
              expiresAt,
            },
          ]
        : [];

    return [...unverified, ...expiring];
  });
}

// ── Quota ─────────────────────────────────

/** Buckets at or above the threshold; `project` undefined means the organization's own. */
export function quotaIssues(
  scope: { orgName: string; project?: string },
  buckets: readonly ComMiloapisQuotaV1Alpha1AllowanceBucket[]
): OrgIssue[] {
  return buckets.flatMap((bucket) => {
    const allocated = bucket.status?.allocated ?? 0;
    const limit = bucket.status?.limit ?? 0;
    // A limit of 1 or 0 is present-or-absent, not pressure (#715).
    if (limit <= 1 || allocated / limit < QUOTA_USAGE_THRESHOLD) return [];
    const resourceType = bucket.spec?.resourceType ?? bucket.metadata?.name ?? '';
    const percent = Math.round((allocated / limit) * 100);
    return [
      {
        id: `quota/${scope.project ?? scope.orgName}/${bucket.metadata?.name ?? resourceType}`,
        area: 'quota',
        kind: 'Quota',
        name: resourceType,
        ...(scope.project && { project: scope.project }),
        severity: 'warning',
        reason: `${percent}% of limit`,
        message: `Using ${allocated} of ${limit}`,
        href: scope.project
          ? projectRoutes.quota.usage(scope.project)
          : orgRoutes.quota.usage(scope.orgName),
      },
    ];
  });
}

// ── List ──────────────────────────────────

const SEVERITY_RANK: Record<IssueSeverity, number> = { danger: 0, warning: 1, low: 2 };

/** Severity first, then most recently started; issues with no start time go last. */
export function sortIssues(issues: readonly OrgIssue[]): OrgIssue[] {
  return [...issues].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const timeA = realTime(a.since) ?? -Infinity;
    const timeB = realTime(b.since) ?? -Infinity;
    return timeB - timeA;
  });
}

export interface AreaCount {
  /** Resources checked in this area. */
  total: number;
  /** Danger and warning issues. */
  issues: number;
  /** Low-priority issues, which don't change the verdict. */
  low: number;
}

export const ISSUE_AREAS: readonly IssueArea[] = [
  'workloads',
  'instances',
  'loadBalancers',
  'domains',
  'dnsZones',
  'quota',
];

/** Issue counts per area, alongside how many resources each area checked. */
export function countByArea(
  issues: readonly OrgIssue[],
  totals: Readonly<Record<IssueArea, number>>
): Record<IssueArea, AreaCount> {
  return Object.fromEntries(
    ISSUE_AREAS.map((area) => {
      const inArea = issues.filter((issue) => issue.area === area);
      return [
        area,
        {
          total: totals[area],
          issues: inArea.filter((issue) => issue.severity !== 'low').length,
          low: inArea.filter((issue) => issue.severity === 'low').length,
        },
      ];
    })
  ) as Record<IssueArea, AreaCount>;
}

// ── Collect ───────────────────────────────

/** One project's load balancers, domains, DNS zones and quota buckets. */
export interface ProjectNetworkStatus {
  proxies: readonly ComDatumapisNetworkingV1AlphaHttpProxy[];
  domains: readonly ComDatumapisNetworkingV1AlphaDomain[];
  dnsZones: readonly ComMiloapisNetworkingDnsV1Alpha1DnsZone[];
  quotaBuckets: readonly ComMiloapisQuotaV1Alpha1AllowanceBucket[];
}

export interface OrgIssueSources {
  orgName: string;
  /** Each project with whatever has loaded for it; missing parts are skipped. */
  projects: readonly {
    name: string;
    compute?: ProjectComputeStatus;
    network?: ProjectNetworkStatus;
  }[];
  orgQuotaBuckets?: readonly ComMiloapisQuotaV1Alpha1AllowanceBucket[];
}

/** Every issue across the organization, sorted, with how many resources each area checked. */
export function collectOrgIssues(
  { orgName, projects, orgQuotaBuckets = [] }: OrgIssueSources,
  now: number
): { issues: OrgIssue[]; totals: Record<IssueArea, number> } {
  const issues = [
    ...projects.flatMap(({ name, compute, network }) => [
      ...(compute
        ? [
            ...workloadIssues(name, compute.workloads, now),
            ...instanceIssues(name, compute.instances, now),
          ]
        : []),
      ...(network
        ? [
            ...httpProxyIssues(name, network.proxies, now),
            ...domainIssues(name, network.domains, now),
            ...dnsZoneIssues(name, network.dnsZones, now),
            ...quotaIssues({ orgName, project: name }, network.quotaBuckets),
          ]
        : []),
    ]),
    ...quotaIssues({ orgName }, orgQuotaBuckets),
  ];

  const sum = (pick: (p: OrgIssueSources['projects'][number]) => number) =>
    projects.reduce((total, project) => total + pick(project), 0);

  return {
    issues: sortIssues(issues),
    totals: {
      workloads: sum((p) => p.compute?.workloads.length ?? 0),
      instances: sum((p) => p.compute?.instances.length ?? 0),
      loadBalancers: sum((p) => p.network?.proxies.length ?? 0),
      domains: sum((p) => p.network?.domains.length ?? 0),
      dnsZones: sum((p) => p.network?.dnsZones.length ?? 0),
      quota: sum((p) => p.network?.quotaBuckets.length ?? 0) + orgQuotaBuckets.length,
    },
  };
}
