import type { ServiceSpend } from '../../lib/account-usage';
import { ServiceSpendList } from './billing-account-usage-card';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => children,
  Plural: ({ value }: { value: number }) => String(value),
}));
vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));

const text = (node: React.ReactElement) =>
  renderToStaticMarkup(node)
    .replace(/<[^>]+>/g, '')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&');

const service = (id: string, amount: number, beforeDiscounts = amount): ServiceSpend => ({
  id,
  title: id,
  amount,
  beforeDiscounts,
  discount: beforeDiscounts - amount,
  topMeterId: `${id}-meter`,
});

const list = (services: ServiceSpend[]) => (
  <ServiceSpendList orgName="acme" services={services} currency="USD" onSelect={() => {}} />
);

describe('ServiceSpendList', () => {
  it('shows a discounted service before and after its discount', () => {
    const html = text(list([service('Compute', 0, 40)]));
    // The price before discounts, struck through, then what's due.
    expect(html).toContain('Compute$40.00$0');
    expect(html).toContain('100% of usage');
    expect(html).toContain('100% off');
  });

  it('shows only the cost of a service that is not discounted', () => {
    const html = text(list([service('Network', 12.5)]));
    expect(html).toContain('Network$12.50');
    expect(html).not.toContain('% off');
  });
});
