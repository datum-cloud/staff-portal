import { extractionToFormValues } from './extract-mapping';
import { describe, expect, test } from 'vitest';

describe('extractionToFormValues', () => {
  test('returns empty defaults when every field is null', () => {
    const values = extractionToFormValues({
      displayName: null,
      legalEntity: null,
      countryOfIncorporation: null,
      website: null,
      purpose: null,
      dataCategories: null,
      dataSubjectTypes: null,
      processingRegions: null,
      transferMechanism: null,
      dpaReference: null,
      effectiveDate: null,
    });

    expect(values.displayName).toBe('');
    expect(values.legalEntity).toBe('');
    expect(values.countryOfIncorporation).toBe('');
    expect(values.dataCategories).toEqual([]);
    expect(values.dataSubjectTypes).toEqual([]);
    expect(values.processingRegionsCsv).toBe('');
    expect(values.transferMechanism).toBeUndefined();
    expect(values.hasComplianceProfile).toBe(false);
    expect(values.phase).toBe('Draft');
    expect(values.effectiveDate).toBeUndefined();
  });

  test('uppercases ISO country codes and rejects free-form country names', () => {
    expect(
      extractionToFormValues({
        displayName: null,
        legalEntity: null,
        countryOfIncorporation: 'us',
        website: null,
        purpose: null,
        dataCategories: null,
        dataSubjectTypes: null,
        processingRegions: null,
        transferMechanism: null,
        dpaReference: null,
        effectiveDate: null,
      }).countryOfIncorporation
    ).toBe('US');

    expect(
      extractionToFormValues({
        displayName: null,
        legalEntity: null,
        countryOfIncorporation: 'United States',
        website: null,
        purpose: null,
        dataCategories: null,
        dataSubjectTypes: null,
        processingRegions: null,
        transferMechanism: null,
        dpaReference: null,
        effectiveDate: null,
      }).countryOfIncorporation
    ).toBe('');
  });

  test('drops unknown enum values, dedupes valid ones', () => {
    const values = extractionToFormValues({
      displayName: null,
      legalEntity: null,
      countryOfIncorporation: null,
      website: null,
      purpose: null,
      // @ts-expect-error - simulate Claude returning bad enums
      dataCategories: ['identity', 'identity', 'made-up', 'telemetry'],
      // @ts-expect-error
      dataSubjectTypes: ['consumer', 'ghost', 'consumer'],
      processingRegions: null,
      // @ts-expect-error
      transferMechanism: 'PrayerAndHope',
      dpaReference: null,
      effectiveDate: null,
    });

    expect(values.dataCategories).toEqual(['identity', 'telemetry']);
    expect(values.dataSubjectTypes).toEqual(['consumer']);
    expect(values.transferMechanism).toBeUndefined();
  });

  test('joins processing regions into a CSV string and trims whitespace', () => {
    const values = extractionToFormValues({
      displayName: null,
      legalEntity: null,
      countryOfIncorporation: null,
      website: null,
      purpose: null,
      dataCategories: null,
      dataSubjectTypes: null,
      processingRegions: ['  US  ', 'EU', '', '  '],
      transferMechanism: null,
      dpaReference: null,
      effectiveDate: null,
    });

    expect(values.processingRegionsCsv).toBe('US, EU');
  });

  test('parses a YYYY-MM-DD effective date through the form helper', () => {
    const values = extractionToFormValues({
      displayName: null,
      legalEntity: null,
      countryOfIncorporation: null,
      website: null,
      purpose: null,
      dataCategories: null,
      dataSubjectTypes: null,
      processingRegions: null,
      transferMechanism: null,
      dpaReference: null,
      effectiveDate: '2026-04-05',
    });

    expect(values.effectiveDate).toBeInstanceOf(Date);
    expect((values.effectiveDate as Date).toISOString().slice(0, 10)).toBe('2026-04-05');
  });

  test('opens the compliance profile section when profile signals are present', () => {
    const values = extractionToFormValues({
      displayName: 'Acme',
      legalEntity: 'Acme Corp',
      countryOfIncorporation: 'US',
      website: null,
      purpose: 'Cloud infrastructure',
      dataCategories: null,
      dataSubjectTypes: null,
      processingRegions: null,
      transferMechanism: 'SCCs',
      dpaReference: null,
      effectiveDate: null,
    });

    expect(values.hasComplianceProfile).toBe(true);
    expect(values.purpose).toBe('Cloud infrastructure');
    expect(values.transferMechanism).toBe('SCCs');
  });

  test('keeps the compliance profile section closed when only basic identity is filled', () => {
    const values = extractionToFormValues({
      displayName: 'Acme',
      legalEntity: 'Acme Corp',
      countryOfIncorporation: 'US',
      website: 'https://acme.example',
      purpose: null,
      dataCategories: null,
      dataSubjectTypes: null,
      processingRegions: null,
      transferMechanism: null,
      dpaReference: null,
      effectiveDate: null,
    });

    expect(values.hasComplianceProfile).toBe(false);
  });
});
