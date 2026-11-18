import type { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';

export type DnsZoneStatus = NonNullable<ComMiloapisNetworkingDnsV1Alpha1DnsZone['status']>;
export type DnsZoneCondition = NonNullable<DnsZoneStatus['conditions']>[number];

export type DnsZoneReadiness = 'ready' | 'pending' | 'failed';

export interface DnsZoneReadinessInfo {
  readiness: DnsZoneReadiness;
  /** `reason` of the condition holding the zone back; absent when ready. */
  reason?: string;
  /** `message` of the condition holding the zone back; absent when ready or empty. */
  message?: string;
}

const READY = 'Ready';
const ACCEPTED_AND_PROGRAMMED = ['Accepted', 'Programmed'];
/**
 * Reasons the DNS operator sets with status False while a zone is still on its way,
 * not broken: waiting on the DNS backend, or on the domain's ownership check.
 */
const PENDING_REASONS = new Set(['Pending', 'PendingDomainVerification']);

/** The conditions that decide readiness: Ready, else Accepted and Programmed, else all of them. */
function requiredConditions(conditions: DnsZoneCondition[]): DnsZoneCondition[] {
  const ready = conditions.filter((c) => c.type === READY);
  if (ready.length > 0) return ready;
  const known = conditions.filter((c) => ACCEPTED_AND_PROGRAMMED.includes(c.type));
  return known.length > 0 ? known : conditions;
}

const isFailed = (c: DnsZoneCondition): boolean =>
  c.status === 'False' && !PENDING_REASONS.has(c.reason ?? '');

const describeBlocker = (
  readiness: DnsZoneReadiness,
  blocker: DnsZoneCondition
): DnsZoneReadinessInfo => ({
  readiness,
  reason: blocker.reason,
  ...(blocker.message ? { message: blocker.message } : {}),
});

/**
 * Summarises a DNS zone's `status.conditions` as ready, pending or failed.
 * Returns `undefined` when the zone carries no status at all (search-index
 * rows), so the caller can show "no data" rather than "pending".
 */
export function getDnsZoneReadiness(
  status: Pick<DnsZoneStatus, 'conditions'> | undefined | null
): DnsZoneReadinessInfo | undefined {
  if (!status) return undefined;

  const required = requiredConditions(status.conditions ?? []);
  if (required.length === 0) return { readiness: 'pending' };

  const failed = required.find(isFailed);
  if (failed) return describeBlocker('failed', failed);

  const waiting = required.find((c) => c.status !== 'True');
  return waiting ? describeBlocker('pending', waiting) : { readiness: 'ready' };
}

/** A nameserver as a fully qualified name, with the trailing dot. */
export function toNameserverFqdn(hostname: string): string {
  const trimmed = hostname.trim();
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}
