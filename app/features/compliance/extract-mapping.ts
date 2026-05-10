import type { ContractExtraction } from './extract-schema';
import {
  DATA_CATEGORIES,
  DATA_SUBJECT_TYPES,
  TRANSFER_MECHANISMS,
  type DataCategory,
  type DataSubjectType,
  type TransferMechanism,
} from './types';
import { effectiveDateToForm, emptyVendorFormValues, type VendorFormValues } from './vendor-form';

function intersectEnum<T extends string>(values: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(values)) return [];
  const set = new Set<string>(allowed);
  const out: T[] = [];
  for (const v of values) {
    if (typeof v === 'string' && set.has(v)) out.push(v as T);
  }
  return Array.from(new Set(out));
}

function trimOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseCountry(value: unknown): string {
  const raw = trimOrEmpty(value);
  return /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : '';
}

/**
 * Turn the extracted-from-PDF object into a VendorFormValues that the create
 * dialog can prefill. Anything Claude couldn't determine becomes the empty
 * default for that field — we never invent values.
 *
 * `hasComplianceProfile` is set to true when at least one profile-specific
 * field came back populated (purpose, dataCategories, transferMechanism, etc.),
 * so the conditional section in the dialog is open by default for an
 * obviously-DPA-shaped contract but closed for an ordinary MSA.
 */
export function extractionToFormValues(extraction: ContractExtraction): VendorFormValues {
  const dataCategories = intersectEnum<DataCategory>(extraction.dataCategories, DATA_CATEGORIES);
  const dataSubjectTypes = intersectEnum<DataSubjectType>(
    extraction.dataSubjectTypes,
    DATA_SUBJECT_TYPES
  );
  const transferMechanism =
    typeof extraction.transferMechanism === 'string' &&
    (TRANSFER_MECHANISMS as readonly string[]).includes(extraction.transferMechanism)
      ? (extraction.transferMechanism as TransferMechanism)
      : undefined;
  const processingRegions = Array.isArray(extraction.processingRegions)
    ? extraction.processingRegions
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

  const profileSignals: unknown[] = [
    extraction.purpose,
    extraction.dpaReference,
    extraction.effectiveDate,
    transferMechanism,
    dataCategories.length > 0 ? 'x' : null,
    dataSubjectTypes.length > 0 ? 'x' : null,
    processingRegions.length > 0 ? 'x' : null,
  ];
  const hasComplianceProfile = profileSignals.some(
    (v) => typeof v === 'string' && v.trim().length > 0
  );

  return {
    ...emptyVendorFormValues,
    name: '',
    displayName: trimOrEmpty(extraction.displayName),
    legalEntity: trimOrEmpty(extraction.legalEntity),
    countryOfIncorporation: normaliseCountry(extraction.countryOfIncorporation),
    website: trimOrEmpty(extraction.website),
    hasComplianceProfile,
    purpose: trimOrEmpty(extraction.purpose),
    dataCategories,
    dataSubjectTypes,
    processingRegionsCsv: processingRegions.join(', '),
    transferMechanism,
    riskTier: undefined,
    phase: 'Draft',
    dpaReference: trimOrEmpty(extraction.dpaReference),
    effectiveDate: effectiveDateToForm(extraction.effectiveDate ?? undefined),
  };
}
