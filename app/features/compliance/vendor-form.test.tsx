import type { Vendor } from './types';
import {
  effectiveDateToApi,
  effectiveDateToForm,
  emptyVendorFormValues,
  formValuesToSpec,
  slugifyName,
  vendorToFormValues,
  type VendorFormValues,
} from './vendor-form';
import { describe, expect, test } from 'vitest';

const baseValues: VendorFormValues = {
  ...emptyVendorFormValues,
  name: 'acme-corp',
  displayName: 'Acme Corporation',
  legalEntity: 'Acme Corporation, Inc.',
  countryOfIncorporation: 'US',
  website: 'https://acme.example',
};

describe('formValuesToSpec', () => {
  test('omits the compliance profile when the toggle is off', () => {
    const spec = formValuesToSpec(baseValues);

    expect(spec).toEqual({
      displayName: 'Acme Corporation',
      legalEntity: 'Acme Corporation, Inc.',
      countryOfIncorporation: 'US',
      website: 'https://acme.example',
    });
    expect(spec.complianceProfile).toBeUndefined();
  });

  test('drops the empty website rather than sending an empty string', () => {
    const spec = formValuesToSpec({ ...baseValues, website: '   ' });

    expect(spec.website).toBeUndefined();
  });

  test('builds a compliance profile and filters unknown CSV entries', () => {
    const spec = formValuesToSpec({
      ...baseValues,
      hasComplianceProfile: true,
      purpose: 'Cloud infrastructure',
      dataCategories: ['identity', 'telemetry'],
      dataSubjectTypes: ['consumer'],
      processingRegionsCsv: 'US, EU',
      transferMechanism: 'SCCs',
      riskTier: 'High',
      phase: 'Active',
      dpaReference: 'https://example/dpa',
      effectiveDate: new Date('2026-01-01T00:00:00Z'),
    });

    expect(spec.complianceProfile).toEqual({
      purpose: 'Cloud infrastructure',
      dataCategories: ['identity', 'telemetry'],
      dataSubjectTypes: ['consumer'],
      processingRegions: ['US', 'EU'],
      transferMechanism: 'SCCs',
      riskTier: 'High',
      phase: 'Active',
      dpaReference: 'https://example/dpa',
      effectiveDate: '2026-01-01T00:00:00Z',
    });
  });

  test('omits processingRegions when no values are provided', () => {
    const spec = formValuesToSpec({
      ...baseValues,
      hasComplianceProfile: true,
      purpose: 'p',
      dataCategories: ['identity'],
      transferMechanism: 'AdequacyDecision',
      riskTier: 'Low',
      phase: 'Draft',
    });

    expect(spec.complianceProfile?.processingRegions).toBeUndefined();
  });
});

describe('vendorToFormValues', () => {
  test('round-trips a vendor without a compliance profile', () => {
    const vendor: Vendor = {
      metadata: { name: 'acme' },
      spec: {
        displayName: 'Acme',
        legalEntity: 'Acme Inc',
        countryOfIncorporation: 'US',
      },
    };

    const values = vendorToFormValues(vendor);

    expect(values.hasComplianceProfile).toBe(false);
    expect(values.dataCategories).toEqual([]);
    expect(values.phase).toBeUndefined();
    expect(values.name).toBe('acme');
  });

  test('round-trips a vendor with a compliance profile', () => {
    const vendor: Vendor = {
      metadata: { name: 'acme' },
      spec: {
        displayName: 'Acme',
        legalEntity: 'Acme Inc',
        countryOfIncorporation: 'US',
        complianceProfile: {
          purpose: 'Cloud',
          dataCategories: ['identity', 'telemetry'],
          dataSubjectTypes: ['consumer'],
          processingRegions: ['US', 'EU'],
          transferMechanism: 'SCCs',
          riskTier: 'High',
          phase: 'Active',
          dpaReference: 'https://example/dpa',
        },
      },
    };

    const values = vendorToFormValues(vendor);

    expect(values.hasComplianceProfile).toBe(true);
    expect(values.dataCategories).toEqual(['identity', 'telemetry']);
    expect(values.dataSubjectTypes).toEqual(['consumer']);
    expect(values.processingRegionsCsv).toBe('US, EU');
    expect(values.transferMechanism).toBe('SCCs');
    expect(values.phase).toBe('Active');
  });
});

describe('slugifyName', () => {
  test('lowercases and replaces non-alphanumerics with hyphens', () => {
    expect(slugifyName('Acme Corporation')).toBe('acme-corporation');
  });

  test('collapses runs of separators and trims edges', () => {
    expect(slugifyName('  Acme   Corp_ Inc.  ')).toBe('acme-corp-inc');
  });

  test('strips diacritics via NFKD normalisation', () => {
    expect(slugifyName('Société Générale')).toBe('societe-generale');
  });

  test('caps the result at 63 characters and avoids trailing hyphens', () => {
    const long = 'A'.repeat(70) + ' Inc';
    const slug = slugifyName(long);
    expect(slug.length).toBeLessThanOrEqual(63);
    expect(slug.endsWith('-')).toBe(false);
  });

  test('returns an empty string for input with no usable characters', () => {
    expect(slugifyName('!!!')).toBe('');
  });
});

describe('effectiveDate helpers', () => {
  test('round-trips an API date-time string through Date and back', () => {
    const formValue = effectiveDateToForm('2026-04-05T00:00:00Z');
    expect(formValue).toBeInstanceOf(Date);
    expect(effectiveDateToApi(formValue)).toBe('2026-04-05T00:00:00Z');
  });

  test('produces undefined for empty / undefined input on both sides', () => {
    expect(effectiveDateToForm(undefined)).toBeUndefined();
    expect(effectiveDateToForm('')).toBeUndefined();
    expect(effectiveDateToApi(undefined)).toBeUndefined();
  });

  test('skips invalid dates rather than throwing', () => {
    expect(effectiveDateToForm('not-a-date')).toBeUndefined();
    expect(effectiveDateToApi(new Date('not-a-date'))).toBeUndefined();
  });

  test('formats a Date as RFC3339 date-time pinned to UTC midnight', () => {
    expect(effectiveDateToApi(new Date('2026-12-31T15:30:00Z'))).toBe('2026-12-31T00:00:00Z');
  });
});
