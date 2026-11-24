import type { UsageSummaryRow } from '../usage.types';
import { SpendBreakdown } from './spend-breakdown';
import { UsageSummaryTable } from './usage-summary-table';
import type { UsageSpend } from '@/modules/billing/usage.types';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));
vi.mock('./usage-sparkline', () => ({ UsageSparkline: () => null }));

const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const text = (node: React.ReactElement) => html(node).replace(/<[^>]+>/g, '');
// The column headers; group header rows are table headers too, but empty.
const headers = (markup: string) =>
  [...markup.matchAll(/<th[^>]*>(.*?)<\/th>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);

const row = (id: string, spend?: UsageSpend): UsageSummaryRow => ({
  id,
  apiName: id,
  label: id,
  unit: { kind: 'count', scale: 1 },
  used: 10,
  limit: 0,
  spend,
  series: [],
  group: 'Compute',
  groupId: 'compute.miloapis.com',
});

describe('UsageSummaryTable', () => {
  it('shows only the cost when nothing is discounted', () => {
    const markup = html(
      <UsageSummaryTable
        rows={[row('cpu', { amount: 20, beforeDiscounts: 20, discount: 0, currency: 'USD' })]}
      />
    );
    expect(headers(markup)).toEqual(['Product', 'Trend', 'Usage', 'Cost']);
  });

  it('strikes through the cost before discount beside a discounted cost', () => {
    const markup = html(
      <UsageSummaryTable
        rows={[
          row('cpu', { amount: 0, beforeDiscounts: 40, discount: 40, currency: 'USD' }),
          row('egress', { amount: 20, beforeDiscounts: 20, discount: 0, currency: 'USD' }),
        ]}
      />
    );
    expect(headers(markup)).toEqual(['Product', 'Trend', 'Usage', 'Cost']);
    // Only the discounted row shows an amount before discount.
    expect([...markup.matchAll(/line-through[^>]*>([^<]*)</g)].map((m) => m[1])).toEqual([
      '$40.00',
    ]);
    expect(markup.replace(/<[^>]+>/g, '')).toContain('$40.00$0');
  });
});

describe('SpendBreakdown', () => {
  it('shows what a discount took off', () => {
    expect(
      text(
        <SpendBreakdown
          spend={{ amount: 0, beforeDiscounts: 412.3, discount: 412.3, currency: 'USD' }}
        />
      )
    ).toBe('$412.30 before discount · −$412.30 (100% off)');
  });

  it('renders nothing without a discount', () => {
    expect(text(<SpendBreakdown spend={{ amount: 12, currency: 'USD' }} />)).toBe('');
  });
});
