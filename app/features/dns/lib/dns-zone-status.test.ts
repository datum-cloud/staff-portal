import { getDnsZoneReadiness, toNameserverFqdn } from './dns-zone-status';
import { describe, expect, it } from 'vitest';

const condition = (
  type: string,
  status: 'True' | 'False' | 'Unknown',
  reason = 'Reason',
  message = ''
) => ({ type, status, reason, message, lastTransitionTime: '2026-10-01T10:00:00Z' });

describe('getDnsZoneReadiness', () => {
  it('returns undefined when the zone has no status (search-index rows)', () => {
    expect(getDnsZoneReadiness(undefined)).toBeUndefined();
  });

  it('is pending when the controller has not written any condition yet', () => {
    expect(getDnsZoneReadiness({})).toEqual({ readiness: 'pending' });
    expect(getDnsZoneReadiness({ conditions: [] })).toEqual({ readiness: 'pending' });
  });

  it('is ready when Accepted and Programmed are both True', () => {
    expect(
      getDnsZoneReadiness({
        conditions: [condition('Accepted', 'True'), condition('Programmed', 'True')],
      })
    ).toEqual({ readiness: 'ready' });
  });

  it('prefers a Ready condition over Accepted and Programmed', () => {
    expect(
      getDnsZoneReadiness({
        conditions: [condition('Ready', 'True'), condition('Programmed', 'False', 'Failed')],
      })
    ).toEqual({ readiness: 'ready' });
  });

  it('is failed, with the reason and message, when a required condition is False', () => {
    expect(
      getDnsZoneReadiness({
        conditions: [
          condition('Accepted', 'True'),
          condition('Programmed', 'False', 'ProgrammingFailed', 'backend rejected the zone'),
        ],
      })
    ).toEqual({
      readiness: 'failed',
      reason: 'ProgrammingFailed',
      message: 'backend rejected the zone',
    });
  });

  it('is pending when a condition is False only because it is still Pending', () => {
    expect(
      getDnsZoneReadiness({
        conditions: [
          condition('Accepted', 'True'),
          condition('Programmed', 'False', 'Pending', 'waiting for the DNS backend'),
        ],
      })
    ).toEqual({ readiness: 'pending', reason: 'Pending', message: 'waiting for the DNS backend' });
  });

  it('is pending while the domain is still being verified', () => {
    expect(
      getDnsZoneReadiness({
        conditions: [
          condition('Accepted', 'False', 'PendingDomainVerification', 'verify the domain first'),
          condition('Programmed', 'False', 'Pending'),
        ],
      })
    ).toEqual({
      readiness: 'pending',
      reason: 'PendingDomainVerification',
      message: 'verify the domain first',
    });
  });

  it('is pending when a required condition is Unknown', () => {
    expect(
      getDnsZoneReadiness({
        conditions: [condition('Accepted', 'Unknown', 'Validating', 'validating the domain')],
      })
    ).toEqual({ readiness: 'pending', reason: 'Validating', message: 'validating the domain' });
  });

  it('reports a failure ahead of a condition that is only pending', () => {
    expect(
      getDnsZoneReadiness({
        conditions: [
          condition('Accepted', 'Unknown', 'Validating'),
          condition('Programmed', 'False', 'ProgrammingFailed', 'boom'),
        ],
      })?.readiness
    ).toBe('failed');
  });

  it('checks every condition when none of the well-known types is present', () => {
    expect(
      getDnsZoneReadiness({
        conditions: [condition('Synced', 'True'), condition('Delegated', 'False', 'NotDelegated')],
      })?.readiness
    ).toBe('failed');
  });
});

describe('toNameserverFqdn', () => {
  it('adds the trailing dot', () => {
    expect(toNameserverFqdn('ns1.datumdomains.net')).toBe('ns1.datumdomains.net.');
  });

  it('keeps an existing trailing dot and trims whitespace', () => {
    expect(toNameserverFqdn(' ns1.datumdomains.net. ')).toBe('ns1.datumdomains.net.');
  });
});
