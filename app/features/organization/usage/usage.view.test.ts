import { toUsageView } from './usage.view';
import type { UsageFetchResult } from '@/modules/billing/usage.types';
import { describe, expect, it } from 'bun:test';

const points = [{ timestamp: 1, value: 5 }];

function result(): UsageFetchResult {
  return {
    status: 'ok',
    days: 30,
    groups: [
      { id: 'networking', title: 'Networking', meterDefinitions: ['alb-requests', 'alb-ingress'] },
      { id: 'dns', title: 'DNS', meterDefinitions: ['dns-queries'] },
    ],
    meters: [
      { meterDefinition: 'alb-requests', label: 'ALB Requests', values: points, total: 5 },
      { meterDefinition: 'alb-ingress', label: 'ALB Ingress', values: [], total: 0 },
      { meterDefinition: 'dns-queries', label: 'DNS Queries', values: [], total: 0 },
    ],
  };
}

describe('toUsageView', () => {
  it('splits meters without usage from the ones with usage', () => {
    const [networking, dns] = toUsageView(result())?.groups ?? [];

    expect(networking.meters.map((m) => m.id)).toEqual(['alb-requests']);
    expect(networking.idleMeters.map((m) => m.label)).toEqual(['ALB Ingress']);
    expect(dns.meters).toEqual([]);
    expect(dns.idleMeters.map((m) => m.label)).toEqual(['DNS Queries']);
  });

  it('keeps unused meters out of the summary table', () => {
    expect(toUsageView(result())?.summaryRows.map((r) => r.id)).toEqual(['alb-requests']);
  });

  it('marks gauges and carries spend through', () => {
    const data = result();
    data.meters[0].aggregation = 'Latest';
    data.meters[0].spend = { amount: 4.2, currency: 'USD' };
    data.spend = { amount: 4.2, currency: 'USD' };

    const view = toUsageView(data);
    expect(view?.groups[0].meters[0].qualifier).toBe('latest');
    expect(view?.summaryRows[0].spend).toEqual({ amount: 4.2, currency: 'USD' });
    expect(view?.spend).toEqual({ amount: 4.2, currency: 'USD' });
  });

  it('has nothing to show when no meter has usage', () => {
    const data = result();
    data.meters = data.meters.map((m) => ({ ...m, values: [], total: 0 }));
    expect(toUsageView(data)).toBeNull();
  });
});
