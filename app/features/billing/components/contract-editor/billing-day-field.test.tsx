import { BillingDayHint } from './billing-day-field';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/react/macro', () => {
  const ordinal = new Intl.PluralRules('en', { type: 'ordinal' });
  return {
    Trans: ({ children }: { children: React.ReactNode }) => children,
    SelectOrdinal: ({ value, ...forms }: { value: number } & Record<string, string>) =>
      forms[ordinal.select(value)].replace('#', String(value)),
  };
});

const hint = (billingDay: 'StartDate' | 'InvoiceDay', startDay?: number) =>
  renderToStaticMarkup(
    <BillingDayHint billingDay={billingDay} startDay={startDay} invoiceDay={1} />
  ).replaceAll('&#x27;', "'");

describe('BillingDayHint', () => {
  it('names the start date for whole months', () => {
    expect(hint('StartDate', 18)).toBe('Every invoice covers a whole month, the 18th to the 18th.');
    expect(hint('StartDate', 22)).toBe('Every invoice covers a whole month, the 22nd to the 22nd.');
  });

  it('says what happens in shorter months for a start late in the month', () => {
    expect(hint('StartDate', 31)).toBe(
      "Every invoice covers a whole month, the 31st to the 31st, or the month's last day when it's shorter."
    );
  });

  it('prorates the first month on the invoice day', () => {
    expect(hint('InvoiceDay', 18)).toBe(
      'The first invoice covers the 18th to the 1st. After that, every invoice covers a whole month, the 1st to the 1st.'
    );
  });

  it('reads without a start date', () => {
    expect(hint('StartDate')).toBe('Every invoice covers a whole month from the start date.');
    expect(hint('InvoiceDay')).toContain('The first invoice covers the start date to the 1st.');
  });
});
