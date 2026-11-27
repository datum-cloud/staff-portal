import { QUOTA_GRANT_FIELD_MANAGER } from '@/resources/request/client';
import type { ComMiloapisQuotaV1Alpha1ResourceGrant } from '@openapi/quota.miloapis.com/v1alpha1';

/**
 * A quota's limit is the sum of its ResourceGrants, and those grants have
 * different owners (#343). Milo creates a default grant per consumer, GitOps
 * (Flux) applies others, and staff add grants through this portal. Only the
 * staff-added ones can be lowered from here: the others would be put back by
 * the controller that owns them. Pure; the dialog does the requests.
 */

type Grant = ComMiloapisQuotaV1Alpha1ResourceGrant;

/** generateName prefix of grants created from this portal. */
const STAFF_GRANT_PREFIX = 'resource-grant-';

export type GrantOwner =
  /** Added through this portal, for this resource only: can be lowered or removed here. */
  | 'staff'
  /** Applied by GitOps (Flux's kustomize-controller): change it in the infra repo. */
  | 'gitops'
  /** Created by the platform (milo) or something else this portal doesn't own. */
  | 'platform'
  /** Added through this portal but also grants other resources: removing it would lower those too. */
  | 'staff-shared';

const managersOf = (grant: Grant): string[] =>
  (grant.metadata?.managedFields ?? []).map((field) => field.manager ?? '').filter(Boolean);

/**
 * Who owns a grant. Grants created from the browser before this portal set a
 * field manager record the browser's user agent ("Mozilla"), so those count
 * as staff-added when they also have the portal's name prefix.
 */
export function grantOwner(grant: Grant): GrantOwner {
  const managers = managersOf(grant);
  if (managers.includes('kustomize-controller')) return 'gitops';
  const fromPortal =
    managers.includes(QUOTA_GRANT_FIELD_MANAGER) ||
    (managers.some((manager) => manager.startsWith('Mozilla')) &&
      (grant.metadata?.name ?? '').startsWith(STAFF_GRANT_PREFIX));
  if (!fromPortal) return 'platform';
  return (grant.spec?.allowances ?? []).length > 1 ? 'staff-shared' : 'staff';
}

/** What a grant gives one resource type (all its buckets added up). */
export const grantAmountFor = (grant: Grant, resourceType: string): number =>
  (grant.spec?.allowances ?? [])
    .filter((allowance) => allowance.resourceType === resourceType)
    .flatMap((allowance) => allowance.buckets ?? [])
    .reduce((sum, bucket) => sum + (bucket.amount ?? 0), 0);

export interface GrantShare {
  name: string;
  namespace: string;
  owner: GrantOwner;
  amount: number;
  createdAt?: string;
}

export interface QuotaBreakdown {
  /** Each active grant's share of this resource, oldest first. */
  shares: GrantShare[];
  /** The limit these grants add up to. */
  total: number;
  /** Amount from grants this portal can't lower (platform, GitOps, shared). */
  locked: number;
  /** Amount from staff-added grants, which this portal can lower. */
  staffAdded: number;
}

/**
 * Grants the quota system rejected (Active=False) don't count toward a limit.
 * A brand-new grant has no conditions yet, so it counts.
 */
const isActive = (grant: Grant): boolean =>
  !(grant.status?.conditions ?? []).some(
    (condition) => condition.type === 'Active' && condition.status === 'False'
  );

/** How a resource's limit is made up, from the active grants that give it any amount. */
export function quotaBreakdown(grants: readonly Grant[], resourceType: string): QuotaBreakdown {
  const shares = grants
    .filter(isActive)
    .map((grant): GrantShare => ({
      name: grant.metadata?.name ?? '',
      namespace: grant.metadata?.namespace ?? '',
      owner: grantOwner(grant),
      amount: grantAmountFor(grant, resourceType),
      ...(grant.metadata?.creationTimestamp && { createdAt: grant.metadata.creationTimestamp }),
    }))
    .filter((share) => share.amount > 0)
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  const staffAdded = shares
    .filter((share) => share.owner === 'staff')
    .reduce((sum, share) => sum + share.amount, 0);
  const total = shares.reduce((sum, share) => sum + share.amount, 0);
  return { shares, total, locked: total - staffAdded, staffAdded };
}

export type QuotaChangePlan =
  | { kind: 'none' }
  /** Below what this portal can reach; `floor` is the lowest it can go. */
  | { kind: 'below-floor'; floor: number }
  /** Grants to create (amounts) and staff grants to delete (names), in that order. */
  | { kind: 'apply'; create: number[]; remove: string[] };

/**
 * How to move a limit from `current` to `target`.
 *
 * Up: one new grant for the difference. Down: remove staff-added grants,
 * newest first, until enough is gone; if that overshoots, add back one grant
 * for the difference. Creates run before deletes so the limit never dips
 * below the target on the way.
 */
export function planQuotaChange(
  current: number,
  target: number,
  breakdown: QuotaBreakdown
): QuotaChangePlan {
  if (target === current) return { kind: 'none' };
  if (target > current) return { kind: 'apply', create: [target - current], remove: [] };

  const floor = current - breakdown.staffAdded;
  if (target < floor) return { kind: 'below-floor', floor };

  const newestFirst = breakdown.shares.filter((share) => share.owner === 'staff').reverse();
  const toRemove = current - target;
  const { removed, names } = newestFirst.reduce(
    (acc, share) =>
      acc.removed >= toRemove
        ? acc
        : { removed: acc.removed + share.amount, names: [...acc.names, share.name] },
    { removed: 0, names: [] as string[] }
  );
  const giveBack = removed - toRemove;
  return { kind: 'apply', create: giveBack > 0 ? [giveBack] : [], remove: names };
}
