import { CarriedBalance } from './billing-account-contract-card';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

const render = (balance?: string, amountDue?: string) =>
  renderToStaticMarkup(<CarriedBalance balance={balance} amountDue={amountDue} currency="USD" />);

describe('CarriedBalance', () => {
  it('shows what the account already owes and the amount due', () => {
    const html = render('0.23', '700.23');
    expect(html).toContain('Owed from earlier invoices');
    expect(html).toContain('$0.23');
    expect(html).toContain('Amount due');
    expect(html).toContain('$700.23');
  });

  it('shows credit the invoice uses', () => {
    const html = render('-100.00', '600.00');
    expect(html).toContain('Account credit');
    expect(html).toContain('Amount due');
    expect(html).toContain('$600.00');
  });

  it('shows nothing without a balance', () => {
    expect(render('0.00', '700.00')).toBe('');
    expect(render(undefined, undefined)).toBe('');
  });
});
