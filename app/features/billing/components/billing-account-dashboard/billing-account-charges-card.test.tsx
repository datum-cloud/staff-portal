import type { Charge } from '../../lib/charges';
import { buildInvoice } from '../../lib/test-fixtures';
import type { Invoice } from '../../utils';
import { ChargeLineSummary } from '../charges/add-charge-dialog';
import { ChargeAmount, ChargeDescription, ChargeStatusText } from './billing-account-charges-card';
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

const render = (node: React.ReactElement) =>
  renderToStaticMarkup(node).replaceAll('&#x27;', "'").replaceAll('&amp;', '&');

const charge = (spec: Partial<Charge['spec']> = {}, status?: Charge['status']): Charge => ({
  metadata: { name: 'install-abc12' },
  spec: {
    billingAccountRef: { name: 'acme' },
    description: 'Cross-connect install',
    quantity: '2',
    unitAmount: '250.00',
    ...spec,
  },
  ...(status ? { status } : {}),
});

describe('ChargeDescription', () => {
  it('shows the note under the description, marked staff only', () => {
    const html = render(<ChargeDescription charge={charge({ note: 'Agreed price, OPS-1234' })} />);
    expect(html).toContain('Cross-connect install');
    expect(html).toContain('Staff only:');
    expect(html).toContain('Agreed price, OPS-1234');
  });

  it('shows no note label without a note', () => {
    expect(render(<ChargeDescription charge={charge()} />)).not.toContain('Staff only');
  });
});

describe('ChargeAmount', () => {
  it('shows billing’s amount due, and the discount', () => {
    const html = render(
      <ChargeAmount
        charge={charge({ discountPercent: '10' }, { amount: '500.00', amountDue: '450.00' })}
      />
    );
    expect(html).toContain('US$ 450.00');
    expect(html).toContain('less 10%');
  });

  it('works the amount out before billing has', () => {
    expect(render(<ChargeAmount charge={charge({ discountPercent: '10' })} />)).toContain(
      'US$ 450.00'
    );
  });
});

describe('ChargeStatusText', () => {
  it('links an invoiced charge to its invoice’s document, by its Stripe number', () => {
    const invoice: Invoice = {
      ...buildInvoice('acme-2027-01-abc', { documentUri: 'https://pay.stripe.com/invoice/x/pdf' }),
      metadata: {
        name: 'acme-2027-01-abc',
        annotations: { 'openmeter.miloapis.com/stripeInvoiceNumber': 'INV-0042' },
      },
    };
    const html = render(
      <ChargeStatusText
        status={{ kind: 'invoiced', invoiceName: 'acme-2027-01-abc' }}
        invoice={invoice}
      />
    );
    expect(html).toContain('Invoiced on');
    expect(html).toContain('href="https://pay.stripe.com/invoice/x/pdf"');
    expect(html).toContain('INV-0042');
  });

  it('links to the invoices card when the invoice has no document', () => {
    const html = render(
      <ChargeStatusText status={{ kind: 'invoiced', invoiceName: 'acme-2027-01-abc' }} />
    );
    expect(html).toContain('href="#invoices"');
    expect(html).toContain('acme-2027-01-abc');
  });

  it('says what a pending charge waits for', () => {
    expect(
      render(<ChargeStatusText status={{ kind: 'waiting', message: 'waiting for the writer' }} />)
    ).toContain('Waiting: waiting for the writer');
  });
});

describe('ChargeLineSummary', () => {
  it('reads like the invoice line, with how tax is worked out', () => {
    const html = render(
      <ChargeLineSummary
        summary={{
          description: 'Cross-connect install, cage 12',
          line: '2 × US$ 250.00, less 10%',
          amount: 'US$ 450.00',
          dates: '15 Dec 2026',
        }}
      />
    );
    expect(html).toContain('On the invoice');
    expect(html).toContain('Cross-connect install, cage 12');
    expect(html).toContain('2 × US$ 250.00, less 10%');
    expect(html).toContain('US$ 450.00');
    expect(html).toContain('15 Dec 2026 · Tax is worked out by Stripe on the invoice');
  });
});
