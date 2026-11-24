import { contactFormValues } from '../../lib/contact-details';
import type { BillingAccount } from '../../utils';
import { buildContactSchema } from './schema';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));

const values = contactFormValues({
  metadata: { name: 'acme' },
  spec: {
    contactInfo: {
      email: 'jane@acme.example',
      address: { country: 'GB', line1: '1 Main St' },
    },
    taxIds: [{ type: 'gb_vat', value: 'GB123456789' }],
  },
} as BillingAccount);

const errors = (input: typeof values) => {
  const result = buildContactSchema().safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
};

describe('buildContactSchema', () => {
  it('accepts the account as it is', () => {
    expect(errors(values)).toEqual({});
  });

  it('requires a valid contact email, as billing does', () => {
    expect(errors({ ...values, email: ' ' })).toEqual({
      email: 'Enter an email for the billing contact',
    });
    expect(errors({ ...values, email: 'jane@acme' })).toEqual({
      email: 'Enter a valid email address',
    });
  });

  it('leaves the invoice email optional, but checks one that is set', () => {
    expect(errors({ ...values, invoiceEmail: '' })).toEqual({});
    expect(errors({ ...values, invoiceEmail: 'ap' })).toEqual({
      invoiceEmail: 'Enter a valid email address',
    });
  });

  it('needs a country only with an address', () => {
    expect(errors({ ...values, country: '' })).toEqual({
      country: 'Pick a country, which an address needs',
    });
    expect(errors({ ...values, country: '', line1: '' })).toEqual({});
  });

  it('checks each tax ID, and refuses a type twice', () => {
    expect(
      errors({
        ...values,
        taxIds: [
          { type: 'gb_vat', value: 'GB1' },
          { type: 'gb_vat', value: 'GB2' },
          { type: 'VAT', value: '' },
        ],
      })
    ).toEqual({
      'taxIds.1.type': 'The account already has a tax ID of this type',
      'taxIds.2.type': 'Use the jurisdiction_scheme form, like gb_vat',
      'taxIds.2.value': 'Enter the registration number',
    });
  });
});
