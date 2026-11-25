import type { BillingAccount } from '../utils';
import {
  buildContactPatch,
  contactFieldForPath,
  contactFormValues,
  contactUnchanged,
  getCountryOptions,
  taxIdTypeOptions,
} from './contact-details';
import { describe, expect, it } from 'vitest';

const account: BillingAccount = {
  metadata: { name: 'acme', namespace: 'organization-acme' },
  spec: {
    currencyCode: 'USD',
    contactInfo: {
      name: 'Jane Doe',
      email: 'jane@acme.example',
      businessName: 'Acme Ltd',
      invoiceEmails: ['ap@acme.example', 'unused@acme.example'],
      address: { country: 'GB', line1: '1 Main St', city: 'London', postalCode: 'N1 1AA' },
    },
    taxIds: [{ type: 'gb_vat', value: 'GB123456789' }],
  },
} as BillingAccount;

describe('contactFormValues', () => {
  it('starts from the account, with the first invoice email', () => {
    expect(contactFormValues(account)).toEqual({
      name: 'Jane Doe',
      email: 'jane@acme.example',
      businessName: 'Acme Ltd',
      invoiceEmail: 'ap@acme.example',
      country: 'GB',
      line1: '1 Main St',
      line2: '',
      city: 'London',
      region: '',
      postalCode: 'N1 1AA',
      taxIds: [{ type: 'gb_vat', value: 'GB123456789' }],
    });
  });

  it('starts empty for an account without contact details', () => {
    const values = contactFormValues({ metadata: { name: 'acme' }, spec: {} } as BillingAccount);
    expect(values.email).toBe('');
    expect(values.country).toBe('');
    expect(values.taxIds).toEqual([]);
  });
});

describe('buildContactPatch', () => {
  it('patches only contactInfo and taxIds, keeping one invoice email', () => {
    const values = { ...contactFormValues(account), invoiceEmail: ' AP@Acme.example ' };
    expect(buildContactPatch(values)).toEqual({
      spec: {
        contactInfo: {
          email: 'jane@acme.example',
          name: 'Jane Doe',
          businessName: 'Acme Ltd',
          invoiceEmails: ['ap@acme.example'],
          address: {
            country: 'GB',
            line1: '1 Main St',
            line2: null,
            city: 'London',
            region: null,
            postalCode: 'N1 1AA',
          },
        },
        taxIds: [{ type: 'gb_vat', value: 'GB123456789' }],
      },
    });
  });

  it('sends null for cleared fields, which a merge patch would otherwise keep', () => {
    const patch = buildContactPatch({
      ...contactFormValues(account),
      name: ' ',
      businessName: '',
      invoiceEmail: '',
      taxIds: [],
    });
    expect(patch.spec.contactInfo.name).toBeNull();
    expect(patch.spec.contactInfo.businessName).toBeNull();
    expect(patch.spec.contactInfo.invoiceEmails).toEqual([]);
    expect(patch.spec.taxIds).toEqual([]);
  });

  it('removes the address when every address field is cleared', () => {
    const patch = buildContactPatch({
      ...contactFormValues(account),
      country: '',
      line1: '',
      city: '',
      postalCode: '',
    });
    expect(patch.spec.contactInfo.address).toBeNull();
  });
});

describe('contactUnchanged', () => {
  it('is true for the account as it is, and false after an edit', () => {
    expect(contactUnchanged(account, contactFormValues(account))).toBe(true);
    expect(
      contactUnchanged(account, { ...contactFormValues(account), email: 'billing@acme.example' })
    ).toBe(false);
  });
});

describe('contactFieldForPath', () => {
  it('maps billing’s field paths to the form’s fields', () => {
    expect(contactFieldForPath('spec.contactInfo.email')).toBe('email');
    expect(contactFieldForPath('spec.contactInfo.invoiceEmails[0]')).toBe('invoiceEmail');
    expect(contactFieldForPath('spec.contactInfo.address.country')).toBe('country');
    expect(contactFieldForPath('spec.taxIds[1].type')).toBe('taxIds.1.type');
    expect(contactFieldForPath('spec.taxIds[0].value')).toBe('taxIds.0.value');
    expect(contactFieldForPath('spec.paymentTerms')).toBeUndefined();
    expect(contactFieldForPath(undefined)).toBeUndefined();
  });
});

describe('taxIdTypeOptions', () => {
  it('offers the usual types and any other the account has', () => {
    const options = taxIdTypeOptions([{ type: 'no_vat', value: '1' }]);
    expect(options.map((option) => option.value)).toContain('gb_vat');
    expect(options.at(-1)).toEqual({ value: 'no_vat', label: 'no_vat' });
  });
});

describe('getCountryOptions', () => {
  it('names every ISO country, by name', () => {
    const options = getCountryOptions();
    expect(options).toHaveLength(249);
    expect(options).toContainEqual({ value: 'GB', label: 'United Kingdom' });
    expect(options.some((option) => option.value === 'UK')).toBe(false);
    expect(options[0].label <= options[1].label).toBe(true);
  });
});
