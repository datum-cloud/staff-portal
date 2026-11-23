import { emptyChargeFormValues, type ChargeFormValues } from '../../lib/charges';
import { buildChargeSchema } from './schema';
import { describe, expect, it, vi } from 'vitest';

// Lingui's macros are compiled away in the app; tests run the source as is.
vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));

const now = new Date('2026-12-15T10:00:00Z');

const valid: ChargeFormValues = {
  ...emptyChargeFormValues(),
  item: 'Remote hands',
  description: 'Remote hands',
  quantity: '3.5',
  unitAmount: '150',
};

/** The form's errors, by field. */
const errors = (overrides: Partial<ChargeFormValues>) => {
  const result = buildChargeSchema(now).safeParse({ ...valid, ...overrides });
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
};

describe('buildChargeSchema', () => {
  it('accepts a custom item with a quantity and price', () => {
    expect(errors({})).toEqual({});
  });

  it('needs an item, a description and a price', () => {
    expect(errors({ item: '', description: ' ', unitAmount: '' })).toEqual({
      item: 'Pick a catalog item, or type a name for a custom one.',
      description: 'Describe the charge, as the invoice will show it.',
      unitAmount: 'Enter a price per unit, such as 250.00.',
    });
  });

  it('takes quantities and prices with up to two decimal places', () => {
    expect(errors({ quantity: '0' })).toHaveProperty('quantity');
    expect(errors({ quantity: '1.255' })).toHaveProperty('quantity');
    expect(errors({ unitAmount: '1.999' })).toHaveProperty('unitAmount');
    expect(errors({ unitAmount: '0' })).toEqual({});
  });

  it('refuses an amount or discount that isn’t whole cents', () => {
    expect(errors({ quantity: '3.33', unitAmount: '0.15' })).toEqual({
      quantity: "The quantity times the price isn't whole cents. Change the quantity or the price.",
    });
    expect(errors({ quantity: '1', unitAmount: '3.35', discountPercent: '10' })).toEqual({
      discountPercent: "The discount isn't whole cents of the amount. Change the discount.",
    });
    expect(errors({ discountPercent: '0' })).toHaveProperty('discountPercent');
    expect(errors({ discountPercent: '101' })).toHaveProperty('discountPercent');
    expect(errors({ discountPercent: '10' })).toEqual({});
  });

  it('needs a note saying why a charge isn’t taxable', () => {
    expect(errors({ notTaxable: true })).toEqual({ note: "Say why the charge isn't taxable." });
    expect(errors({ notTaxable: true, note: 'A deposit' })).toEqual({});
    expect(errors({ note: 'x'.repeat(501) })).toHaveProperty('note');
  });

  it('checks the supply date only when staff choose it', () => {
    expect(errors({ setPeriod: false, periodStart: '', periodEnd: '' })).toEqual({});
    expect(errors({ setPeriod: true, periodStart: '', periodEnd: '' })).toEqual({
      periodStart: 'Pick a start date.',
      periodEnd: 'Pick an end date.',
    });
    expect(errors({ setPeriod: true, periodStart: '2026-12-15', periodEnd: '2026-12-14' })).toEqual(
      { periodEnd: "The end can't be before the start." }
    );
    expect(errors({ setPeriod: true, periodStart: '2026-12-15', periodEnd: '2026-12-15' })).toEqual(
      {}
    );
  });
});
