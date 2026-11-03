import {
  buildBillingCycleWindows,
  getNextCycleStart,
  getPreviousCycleCutoff,
} from './billing-cycle';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('getPreviousCycleCutoff', () => {
  it('cuts the previous monthly cycle at the same elapsed time', () => {
    const cutoff = getPreviousCycleCutoff(
      { invoiceDayOfMonth: 1, invoiceFrequency: 'Monthly' },
      new Date('2026-11-12T12:00:00Z')
    );
    expect(cutoff.toISOString()).toBe('2026-10-12T12:00:00.000Z');
  });

  it('anchors on the invoice day', () => {
    const cutoff = getPreviousCycleCutoff(
      { invoiceDayOfMonth: 15, invoiceFrequency: 'Monthly' },
      new Date('2026-11-20T00:00:00Z')
    );
    expect(cutoff.toISOString()).toBe('2026-10-20T00:00:00.000Z');
  });

  it('defaults to monthly on day 1', () => {
    expect(getPreviousCycleCutoff(undefined, new Date('2026-11-03T06:00:00Z')).toISOString()).toBe(
      '2026-10-03T06:00:00.000Z'
    );
  });
});

describe('getPreviousCycleCutoff at month end', () => {
  it('stops at the end of a shorter previous cycle', () => {
    // 29.5 days into March; February only has 28.
    expect(getPreviousCycleCutoff(undefined, new Date('2026-03-30T12:00:00Z')).toISOString()).toBe(
      '2026-03-01T00:00:00.000Z'
    );
  });
});

/**
 * The dashboard runs these in the browser, so they must give the same
 * answers whatever the local timezone is.
 */
describe.each(['UTC', 'America/New_York', 'Pacific/Auckland'])('cycle maths in %s', (zone) => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = zone;
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it.each([
    ['2026-12-15T12:00:00Z', '2026-12-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z'],
    ['2026-03-30T12:00:00Z', '2026-03-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z'],
    ['2026-11-01T00:00:00Z', '2026-11-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z'],
  ])('places %s in the cycle %s to %s', (now, start, next) => {
    const [current] = buildBillingCycleWindows(undefined, new Date(now));
    expect(new Date(current.startSec * 1000).toISOString()).toBe(start);
    expect(getNextCycleStart(undefined, new Date(now)).toISOString()).toBe(next);
  });

  it('labels the range in UTC', () => {
    const [current, previous] = buildBillingCycleWindows(
      undefined,
      new Date('2026-11-03T12:00:00Z')
    );
    expect(current.rangeLabel).toBe('1 Nov - 1 Dec 2026');
    expect(previous.rangeLabel).toBe('1 Oct - 1 Nov 2026');
  });

  it('aligns quarterly cycles to calendar quarters on the invoice day', () => {
    const terms = { invoiceDayOfMonth: 15, invoiceFrequency: 'Quarterly' as const };
    const [current] = buildBillingCycleWindows(terms, new Date('2026-11-20T00:00:00Z'));
    expect(new Date(current.startSec * 1000).toISOString()).toBe('2026-10-15T00:00:00.000Z');
    expect(getNextCycleStart(terms, new Date('2026-11-20T00:00:00Z')).toISOString()).toBe(
      '2027-01-15T00:00:00.000Z'
    );
  });

  it.each([
    [
      'Quarterly' as const,
      '2026-11-20T00:00:00Z',
      '2026-12-20T00:00:00Z',
      '2026-10-01T00:00:00.000Z',
    ],
    [
      'Quarterly' as const,
      '2026-10-01T00:00:00Z',
      '2026-12-31T23:59:59Z',
      '2026-10-01T00:00:00.000Z',
    ],
    ['Annual' as const, '2026-03-03T00:00:00Z', '2026-11-03T00:00:00Z', '2026-01-01T00:00:00.000Z'],
  ])('keeps a %s cycle start as now moves from %s to %s', (frequency, from, to, start) => {
    const terms = { invoiceDayOfMonth: 1, invoiceFrequency: frequency };
    for (const now of [from, to]) {
      const [current] = buildBillingCycleWindows(terms, new Date(now));
      expect(new Date(current.startSec * 1000).toISOString()).toBe(start);
    }
  });
});
