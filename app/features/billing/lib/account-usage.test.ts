import {
  getCycleProgress,
  getMeterOptionGroups,
  getServiceSpend,
  getTopMeter,
} from './account-usage';
import type { UsageGroupSection, UsageMeter } from '@/features/organization/usage/usage.types';
import type { UsageView } from '@/features/organization/usage/usage.view';
import { describe, expect, it } from 'vitest';

const meter = (id: string, amount?: number): UsageMeter => ({
  id,
  apiName: id,
  label: id,
  description: '',
  unit: { kind: 'count', scale: 1 },
  used: 1,
  limit: 0,
  spend: amount === undefined ? undefined : { amount, currency: 'USD' },
  tabs: ['Total'],
  series: [],
});

const group = (
  id: string,
  meters: UsageMeter[],
  idleMeters: UsageMeter[] = []
): UsageGroupSection => ({ id, title: id.toUpperCase(), description: '', meters, idleMeters });

const view = (groups: UsageGroupSection[]): UsageView => ({ groups, summaryRows: [] });

const VIEW = view([
  group('network', [meter('egress', 3), meter('ingress', 0.25)]),
  group('compute', [meter('memory', 2.5), meter('vcpu', 11.25)], [meter('gpu')]),
  group('storage', [], [meter('disk')]),
]);

describe('getServiceSpend', () => {
  it('sums each service with usage, highest first, with its top meter', () => {
    expect(getServiceSpend(VIEW)).toEqual([
      { id: 'compute', title: 'COMPUTE', amount: 13.75, topMeterId: 'vcpu' },
      { id: 'network', title: 'NETWORK', amount: 3.25, topMeterId: 'egress' },
    ]);
  });

  it('counts unpriced meters as no spend', () => {
    expect(getServiceSpend(view([group('dns', [meter('queries')])]))).toEqual([
      { id: 'dns', title: 'DNS', amount: 0, topMeterId: 'queries' },
    ]);
  });
});

describe('getMeterOptionGroups', () => {
  it('orders services and their meters by spend and leaves idle meters out', () => {
    const groups = getMeterOptionGroups(VIEW);
    expect(groups.map((g) => g.id)).toEqual(['compute', 'network']);
    expect(groups[0].meters.map((m) => m.id)).toEqual(['vcpu', 'memory']);
  });
});

describe('getTopMeter', () => {
  it('picks the highest-spend meter across services', () => {
    expect(getTopMeter(VIEW)?.id).toBe('vcpu');
  });

  it('is undefined with no usage', () => {
    expect(getTopMeter(view([group('storage', [], [meter('disk')])]))).toBeUndefined();
  });
});

describe('getCycleProgress', () => {
  it('places now within a monthly cycle', () => {
    const progress = getCycleProgress(
      { invoiceDayOfMonth: 1, invoiceFrequency: 'Monthly' },
      new Date('2026-11-12T12:00:00Z')
    );
    expect(progress.start.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(progress.day).toBe(12);
    expect(progress.days).toBe(30);
  });

  it('counts the first day as day 1', () => {
    const progress = getCycleProgress(
      { invoiceDayOfMonth: 15, invoiceFrequency: 'Monthly' },
      new Date('2026-11-15T00:00:00Z')
    );
    expect(progress.day).toBe(1);
    expect(progress.days).toBe(30);
  });
});
