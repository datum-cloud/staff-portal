import { getPreviousCycleCutoff } from './billing-cycle';
import { describe, expect, it } from 'vitest';

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
