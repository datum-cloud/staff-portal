import type { InstanceStatus, WorkloadStatus } from './compute-status';
import {
  collectOrgIssues,
  countByArea,
  dnsZoneIssues,
  domainIssues,
  httpProxyIssues,
  instanceIssues,
  isWaitingReason,
  quotaIssues,
  realTime,
  sortIssues,
  waitingSeverity,
  workloadIssues,
  type OrgIssue,
} from './org-issues';
import type { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';
import type {
  ComDatumapisNetworkingV1AlphaDomain,
  ComDatumapisNetworkingV1AlphaHttpProxy,
} from '@openapi/networking.datumapis.com/v1alpha';
import type { ComMiloapisQuotaV1Alpha1AllowanceBucket } from '@openapi/quota.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

const NOW = Date.parse('2026-11-11T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const P = 'datum-cloud';

const instance = (over: Partial<InstanceStatus>): InstanceStatus => ({
  name: 'web-dfw-us-central-1-0',
  namespace: 'default',
  workloadName: 'web',
  readiness: 'NotReady',
  conditions: [],
  createdAt: ago(30 * DAY),
  href: '/i',
  ...over,
});

const workload = (over: Partial<WorkloadStatus>): WorkloadStatus => ({
  name: 'web',
  namespace: 'default',
  ready: 1,
  desired: 1,
  conditions: [],
  createdAt: ago(30 * DAY),
  href: '/w',
  ...over,
});

describe('time helpers', () => {
  it('treats 1970 and garbage as unknown times', () => {
    expect(realTime('1970-01-01T00:00:00Z')).toBeUndefined();
    expect(realTime('not a date')).toBeUndefined();
    expect(realTime(ago(MIN))).toBe(NOW - MIN);
  });

  it('hides waiting states for 15 minutes, warns until 7 days, then low', () => {
    expect(waitingSeverity(ago(14 * MIN), NOW)).toBeNull();
    expect(waitingSeverity(ago(16 * MIN), NOW)).toBe('warning');
    expect(waitingSeverity(ago(6 * DAY), NOW)).toBe('warning');
    expect(waitingSeverity(ago(8 * DAY), NOW)).toBe('low');
    expect(waitingSeverity(undefined, NOW)).toBe('warning');
  });

  it('knows the waiting reasons', () => {
    for (const reason of [
      'Provisioning',
      'InstancesProvisioning',
      'Starting',
      'PendingQuota',
      'SchedulingGatesPresent',
      'PendingVerification',
      'PendingDomainVerification',
    ]) {
      expect(isWaitingReason(reason)).toBe(true);
    }
    expect(isWaitingReason('ImageUnavailable')).toBe(false);
    expect(isWaitingReason('NetworkServiceBackendNotFound')).toBe(false);
  });
});

describe('instanceIssues', () => {
  it('makes start failures danger right away', () => {
    const [issue] = instanceIssues(
      P,
      [instance({ reason: 'ImageUnavailable', message: 'manifest unknown', since: ago(MIN) })],
      NOW
    );
    expect(issue).toMatchObject({
      area: 'instances',
      severity: 'danger',
      reason: 'ImageUnavailable',
      workloadName: 'web',
      project: P,
    });
  });

  it('ignores ready, suspended and stopped instances', () => {
    expect(
      instanceIssues(
        P,
        [
          instance({ readiness: 'Ready' }),
          instance({ reason: 'Suspended' }),
          instance({ reason: 'Stopped' }),
        ],
        NOW
      )
    ).toEqual([]);
  });

  it('ignores a clean exit and warns on a failed one', () => {
    const exited = (message: string) =>
      instance({
        reason: 'Stopping',
        conditions: [
          {
            type: 'RuntimeReady',
            status: 'False',
            reason: 'RuntimeExited',
            message,
            lastTransitionTime: ago(DAY),
          },
        ],
      });
    expect(instanceIssues(P, [exited('The instance runtime exited (Succeeded)')], NOW)).toEqual([]);
    expect(instanceIssues(P, [exited('The instance runtime exited (Failed)')], NOW)).toMatchObject([
      { severity: 'warning', reason: 'RuntimeExited' },
    ]);
  });

  it('applies the waiting rule to provisioning, falling back from a 1970 time', () => {
    expect(
      instanceIssues(P, [instance({ reason: 'Provisioning', since: ago(5 * MIN) })], NOW)
    ).toEqual([]);
    // Staging reports 1970 on some Ready conditions; creation time is used instead.
    expect(
      instanceIssues(
        P,
        [instance({ reason: 'Provisioning', since: '1970-01-01T00:00:00Z', createdAt: ago(DAY) })],
        NOW
      )
    ).toMatchObject([{ severity: 'warning', since: ago(DAY) }]);
  });
});

describe('workloadIssues', () => {
  it('flags an unavailable workload as danger', () => {
    const conditions = [
      {
        type: 'Available',
        status: 'False' as const,
        reason: 'InstanceCrashing',
        lastTransitionTime: ago(2 * 60 * MIN),
      },
    ];
    expect(workloadIssues(P, [workload({ ready: 0, conditions })], NOW)).toMatchObject([
      { severity: 'danger', reason: 'InstanceCrashing' },
    ]);
  });

  it('flags fewer ready than desired as degraded', () => {
    const conditions = [{ type: 'Available', status: 'True' as const, reason: 'Ok' }];
    expect(workloadIssues(P, [workload({ ready: 1, desired: 3, conditions })], NOW)).toMatchObject([
      { severity: 'danger', reason: 'Degraded', message: '1 of 3 instances ready' },
    ]);
  });

  it('makes a workload provisioning for a month low priority (staging `crashing`)', () => {
    const conditions = [
      {
        type: 'Available',
        status: 'False' as const,
        reason: 'InstancesProvisioning',
        lastTransitionTime: ago(30 * DAY),
      },
    ];
    expect(
      workloadIssues(P, [workload({ name: 'crashing', ready: 0, conditions })], NOW)
    ).toMatchObject([{ severity: 'low', reason: 'InstancesProvisioning' }]);
  });

  it('ignores a healthy workload', () => {
    const conditions = [{ type: 'Available', status: 'True' as const, reason: 'Ok' }];
    expect(workloadIssues(P, [workload({ conditions })], NOW)).toEqual([]);
  });
});

describe('httpProxyIssues', () => {
  it('flags staging `vyos-check` with the Programmed reason', () => {
    const proxy = {
      metadata: { name: 'vyos-check', namespace: 'default', creationTimestamp: ago(36 * DAY) },
      status: {
        conditions: [
          {
            type: 'Accepted',
            status: 'False',
            reason: 'Pending',
            lastTransitionTime: ago(35 * DAY),
          },
          {
            type: 'Programmed',
            status: 'False',
            reason: 'NetworkServiceBackendNotFound',
            message: 'referenced NetworkService "vyos-check" not found',
            lastTransitionTime: ago(35 * DAY),
          },
        ],
      },
    } as unknown as ComDatumapisNetworkingV1AlphaHttpProxy;
    expect(httpProxyIssues(P, [proxy], NOW)).toMatchObject([
      {
        area: 'loadBalancers',
        severity: 'warning',
        reason: 'NetworkServiceBackendNotFound',
        href: '/customers/projects/datum-cloud/albs/vyos-check',
      },
    ]);
  });
});

describe('dnsZoneIssues', () => {
  const zone = (name: string, conditions: object[]) =>
    ({
      metadata: { name, namespace: 'default', creationTimestamp: ago(60 * DAY) },
      status: { conditions },
    }) as unknown as ComMiloapisNetworkingDnsV1Alpha1DnsZone;

  it('flags a zone claimed elsewhere, and one with no Programmed condition', () => {
    const issues = dnsZoneIssues(
      P,
      [
        zone('datum-prod-net-urihy9', [
          {
            type: 'Programmed',
            status: 'False',
            reason: 'DNSZoneInUse',
            lastTransitionTime: ago(DAY),
          },
        ]),
        zone('acme-validation', [
          {
            type: 'Accepted',
            status: 'False',
            reason: 'PendingDomainVerification',
            lastTransitionTime: ago(39 * DAY),
          },
        ]),
        zone('ok', [{ type: 'Programmed', status: 'True', reason: 'Programmed' }]),
      ],
      NOW
    );
    expect(issues.map((i) => [i.name, i.severity, i.reason])).toEqual([
      ['datum-prod-net-urihy9', 'warning', 'DNSZoneInUse'],
      ['acme-validation', 'low', 'PendingDomainVerification'],
    ]);
  });
});

describe('domainIssues', () => {
  const domain = (status: object) =>
    ({
      metadata: { name: 'datum-prod.net', namespace: 'default', creationTimestamp: ago(260 * DAY) },
      status,
    }) as unknown as ComDatumapisNetworkingV1AlphaDomain;

  it('makes a domain unverified for months low priority (staging `datum-prod.net`)', () => {
    expect(
      domainIssues(
        P,
        [
          domain({
            conditions: [
              {
                type: 'Verified',
                status: 'False',
                reason: 'PendingVerification',
                lastTransitionTime: ago(260 * DAY),
              },
            ],
          }),
        ],
        NOW
      )
    ).toMatchObject([{ area: 'domains', severity: 'low', reason: 'PendingVerification' }]);
  });

  it('warns when registration expires within a month or has expired', () => {
    const expiring = domainIssues(
      P,
      [domain({ registration: { expiresAt: new Date(NOW + 12 * DAY).toISOString() } })],
      NOW
    );
    expect(expiring).toMatchObject([{ severity: 'warning', reason: 'ExpiringSoon' }]);
    expect(expiring[0].id).toMatch(/\/expiry$/);

    expect(domainIssues(P, [domain({ registration: { expiresAt: ago(DAY) } })], NOW)).toMatchObject(
      [{ reason: 'Expired' }]
    );
    expect(
      domainIssues(
        P,
        [domain({ registration: { expiresAt: new Date(NOW + 60 * DAY).toISOString() } })],
        NOW
      )
    ).toEqual([]);
  });
});

describe('quotaIssues', () => {
  const bucket = (allocated: number, limit: number) =>
    ({
      metadata: { name: `b-${allocated}-${limit}` },
      spec: { resourceType: 'compute.datumapis.com/cpus' },
      status: { allocated, limit },
    }) as unknown as ComMiloapisQuotaV1Alpha1AllowanceBucket;

  it('flags buckets at 90% or more, skipping limits of 1 or less', () => {
    const issues = quotaIssues({ orgName: 'org-1', project: P }, [
      bucket(47, 50),
      bucket(44, 50),
      bucket(1, 1),
    ]);
    expect(issues).toMatchObject([
      {
        area: 'quota',
        severity: 'warning',
        reason: '94% of limit',
        message: 'Using 47 of 50',
        href: '/customers/projects/datum-cloud/quotas/usage',
      },
    ]);
  });

  it('links org-level buckets to the org quota page', () => {
    expect(quotaIssues({ orgName: 'org-1' }, [bucket(9, 10)])[0]).toMatchObject({
      href: '/customers/organizations/org-1/quotas/usage',
    });
    expect(quotaIssues({ orgName: 'org-1' }, [bucket(9, 10)])[0]).not.toHaveProperty('project');
  });
});

describe('sortIssues and countByArea', () => {
  const issue = (id: string, severity: OrgIssue['severity'], since?: string): OrgIssue => ({
    id,
    area: 'instances',
    kind: 'Instance',
    name: id,
    severity,
    reason: 'r',
    ...(since && { since }),
  });

  it('sorts by severity, then most recent, with untimed last', () => {
    const sorted = sortIssues([
      issue('old-warning', 'warning', ago(3 * DAY)),
      issue('low', 'low', ago(MIN)),
      issue('untimed-warning', 'warning'),
      issue('danger', 'danger', ago(DAY)),
      issue('new-warning', 'warning', ago(40 * MIN)),
    ]);
    expect(sorted.map((i) => i.id)).toEqual([
      'danger',
      'new-warning',
      'old-warning',
      'untimed-warning',
      'low',
    ]);
  });

  it('counts issues and low-priority items per area next to the totals', () => {
    const counts = countByArea(
      [issue('a', 'danger'), issue('b', 'low'), { ...issue('c', 'warning'), area: 'domains' }],
      { workloads: 7, instances: 19, loadBalancers: 5, domains: 6, dnsZones: 4, quota: 12 }
    );
    expect(counts.instances).toEqual({ total: 19, issues: 1, low: 1 });
    expect(counts.domains).toEqual({ total: 6, issues: 1, low: 0 });
    expect(counts.dnsZones).toEqual({ total: 4, issues: 0, low: 0 });
  });
});

describe('collectOrgIssues', () => {
  const zone = {
    metadata: { name: 'z', namespace: 'default', creationTimestamp: ago(DAY) },
    status: { conditions: [{ type: 'Programmed', status: 'False', reason: 'DNSZoneInUse' }] },
  } as unknown as ComMiloapisNetworkingDnsV1Alpha1DnsZone;
  const hotBucket = {
    metadata: { name: 'org-cpus' },
    spec: { resourceType: 'compute.datumapis.com/cpus' },
    status: { allocated: 10, limit: 10 },
  } as unknown as ComMiloapisQuotaV1Alpha1AllowanceBucket;
  const failing = instance({ reason: 'InstanceCrashing', since: ago(MIN) });

  it('combines every source, sorted, with totals per area', () => {
    const { issues, totals } = collectOrgIssues(
      {
        orgName: 'org-1',
        projects: [
          {
            name: 'a',
            compute: {
              workloads: [
                workload({ conditions: [{ type: 'Available', status: 'True', reason: 'Ok' }] }),
              ],
              instances: [failing],
              hasMore: false,
            },
            network: { proxies: [], domains: [], dnsZones: [zone], quotaBuckets: [] },
          },
          // Still loading: contributes nothing yet.
          { name: 'b' },
        ],
        orgQuotaBuckets: [hotBucket],
      },
      NOW
    );
    expect(issues.map((i) => [i.area, i.project ?? 'org'])).toEqual([
      ['instances', 'a'],
      ['dnsZones', 'a'],
      ['quota', 'org'],
    ]);
    expect(totals).toEqual({
      workloads: 1,
      instances: 1,
      loadBalancers: 0,
      domains: 0,
      dnsZones: 1,
      quota: 1,
    });
  });

  it('skips a network source that failed and leaves it out of the totals', () => {
    const { issues, totals } = collectOrgIssues(
      {
        orgName: 'org-1',
        projects: [
          {
            name: 'a',
            // DNS zones and quota couldn't be read for this project.
            network: { proxies: [], domains: [] },
          },
        ],
      },
      NOW
    );
    expect(issues).toEqual([]);
    expect(totals).toMatchObject({ loadBalancers: 0, domains: 0, dnsZones: 0, quota: 0 });
  });
});
