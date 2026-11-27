import { grantOwner, planQuotaChange, quotaBreakdown } from './quota-grants';
import type { ComMiloapisQuotaV1Alpha1ResourceGrant } from '@openapi/quota.miloapis.com/v1alpha1';
import { describe, expect, it } from 'vitest';

const DNS = 'dns.networking.miloapis.com/dnszones';

const grant = (
  name: string,
  managers: string[],
  allowances: { resourceType: string; amount: number }[],
  createdAt = '2026-01-01T00:00:00Z'
): ComMiloapisQuotaV1Alpha1ResourceGrant =>
  ({
    metadata: {
      name,
      namespace: 'milo-system',
      creationTimestamp: createdAt,
      managedFields: managers.map((manager) => ({ manager })),
    },
    spec: {
      consumerRef: { kind: 'Project', name: 'datum-cloud' },
      allowances: allowances.map(({ resourceType, amount }) => ({
        resourceType,
        buckets: [{ amount }],
      })),
    },
  }) as unknown as ComMiloapisQuotaV1Alpha1ResourceGrant;

// The real make-up of datum-cloud's DNS zone quota on staging (60 in total).
const platformDefault = grant(
  'default-dns-quota-datum-cloud',
  ['milo'],
  [
    { resourceType: DNS, amount: 25 },
    { resourceType: 'dns.networking.miloapis.com/dnsrecordsets', amount: 100 },
  ],
  '2025-12-23T00:00:00Z'
);
const gitopsHeadroom = grant(
  'datum-cloud-staging-dns-headroom',
  ['kustomize-controller', 'milo'],
  [{ resourceType: DNS, amount: 30 }],
  '2026-11-12T00:00:00Z'
);
const staffOld = grant(
  'resource-grant-hnmzx',
  ['Mozilla', 'milo'],
  [{ resourceType: DNS, amount: 5 }],
  '2026-06-10T00:00:00Z'
);

describe('grantOwner', () => {
  it('tells platform, GitOps and staff-added grants apart', () => {
    expect(grantOwner(platformDefault)).toBe('platform');
    expect(grantOwner(gitopsHeadroom)).toBe('gitops');
    expect(grantOwner(staffOld)).toBe('staff');
  });

  it('recognises grants this portal creates with its field manager', () => {
    expect(
      grantOwner(
        grant('resource-grant-x', ['datum-staff-portal'], [{ resourceType: DNS, amount: 1 }])
      )
    ).toBe('staff');
  });

  it("doesn't treat a browser-made grant without the portal's name prefix as staff-added", () => {
    expect(grantOwner(grant('hand-made', ['Mozilla'], [{ resourceType: DNS, amount: 1 }]))).toBe(
      'platform'
    );
  });

  it('marks a staff grant that also covers other resources as shared', () => {
    const shared = grant(
      'resource-grant-y',
      ['datum-staff-portal'],
      [
        { resourceType: DNS, amount: 5 },
        { resourceType: 'other', amount: 5 },
      ]
    );
    expect(grantOwner(shared)).toBe('staff-shared');
  });
});

describe('quotaBreakdown', () => {
  it('adds up what each owner gives the resource, oldest first', () => {
    const breakdown = quotaBreakdown([gitopsHeadroom, staffOld, platformDefault], DNS);
    expect(breakdown.shares.map((share) => [share.name, share.owner, share.amount])).toEqual([
      ['default-dns-quota-datum-cloud', 'platform', 25],
      ['resource-grant-hnmzx', 'staff', 5],
      ['datum-cloud-staging-dns-headroom', 'gitops', 30],
    ]);
    expect(breakdown).toMatchObject({ total: 60, locked: 55, staffAdded: 5 });
  });

  it('leaves out grants the quota system rejected', () => {
    const rejected = {
      ...staffOld,
      metadata: { ...staffOld.metadata, name: 'resource-grant-rejected' },
      status: { conditions: [{ type: 'Active', status: 'False' }] },
    } as unknown as ComMiloapisQuotaV1Alpha1ResourceGrant;
    expect(quotaBreakdown([platformDefault, rejected], DNS)).toMatchObject({
      total: 25,
      staffAdded: 0,
    });
  });

  it('leaves out grants that give this resource nothing', () => {
    const other = grant(
      'resource-grant-z',
      ['datum-staff-portal'],
      [{ resourceType: 'other', amount: 9 }]
    );
    expect(quotaBreakdown([other, staffOld], DNS).shares).toHaveLength(1);
  });
});

describe('planQuotaChange', () => {
  const staffNew = grant(
    'resource-grant-new',
    ['datum-staff-portal'],
    [{ resourceType: DNS, amount: 20 }],
    '2026-11-20T00:00:00Z'
  );
  const breakdown = quotaBreakdown([platformDefault, gitopsHeadroom, staffOld, staffNew], DNS); // 80 = 55 locked + 25 staff

  it('does nothing when the limit is unchanged', () => {
    expect(planQuotaChange(80, 80, breakdown)).toEqual({ kind: 'none' });
  });

  it('adds one grant for an increase', () => {
    expect(planQuotaChange(80, 100, breakdown)).toEqual({
      kind: 'apply',
      create: [20],
      remove: [],
    });
  });

  it('removes the newest staff grant when that is exactly enough', () => {
    expect(planQuotaChange(80, 60, breakdown)).toEqual({
      kind: 'apply',
      create: [],
      remove: ['resource-grant-new'],
    });
  });

  it('removes staff grants newest first and gives back any overshoot', () => {
    // Down 22: removing the 20 isn't enough, removing the 5 too overshoots by 3.
    expect(planQuotaChange(80, 58, breakdown)).toEqual({
      kind: 'apply',
      create: [3],
      remove: ['resource-grant-new', 'resource-grant-hnmzx'],
    });
  });

  it('goes down to exactly the locked amount', () => {
    expect(planQuotaChange(80, 55, breakdown)).toEqual({
      kind: 'apply',
      create: [],
      remove: ['resource-grant-new', 'resource-grant-hnmzx'],
    });
  });

  it('refuses to go below what staff added, and says how low it can go', () => {
    expect(planQuotaChange(80, 54, breakdown)).toEqual({ kind: 'below-floor', floor: 55 });
  });

  it("can't lower a quota at all when staff added nothing", () => {
    const onlyLocked = quotaBreakdown([platformDefault], DNS);
    expect(planQuotaChange(25, 20, onlyLocked)).toEqual({ kind: 'below-floor', floor: 25 });
  });
});
