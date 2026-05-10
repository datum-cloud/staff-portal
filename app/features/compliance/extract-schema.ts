import {
  DATA_CATEGORIES,
  DATA_SUBJECT_TYPES,
  PHASES,
  RISK_TIERS,
  TRANSFER_MECHANISMS,
} from './types';
import { z } from 'zod';

/**
 * Schema for the structured output we ask Claude to produce when given a
 * vendor contract PDF. Every field is `.nullable()` because we explicitly
 * want Claude to return `null` rather than guess when a value is not present
 * in the document — better to leave a blank for staff to fill in than to
 * hallucinate.
 *
 * This schema is shared between:
 *   - the staff-portal server route that calls `generateObject` against the
 *     Anthropic SDK,
 *   - the client-side mapping helper that turns Claude's output into
 *     VendorFormValues so the dialog can prefill.
 */
export const contractExtractionSchema = z.object({
  displayName: z.string().nullable().describe("The vendor's public-facing name."),
  legalEntity: z
    .string()
    .nullable()
    .describe('The full registered legal name of the vendor entity.'),
  countryOfIncorporation: z
    .string()
    .nullable()
    .describe(
      'ISO 3166-1 alpha-2 code (e.g., US, DE, GB) of the country where the vendor is incorporated.'
    ),
  website: z.string().nullable().describe("The vendor's primary public website URL."),
  purpose: z
    .string()
    .nullable()
    .describe('A one or two sentence description of what the vendor does with personal data.'),
  dataCategories: z
    .array(z.enum(DATA_CATEGORIES))
    .nullable()
    .describe(
      'Categories of personal data processed by the vendor. Allowed values: ' +
        DATA_CATEGORIES.join(', ')
    ),
  dataSubjectTypes: z
    .array(z.enum(DATA_SUBJECT_TYPES))
    .nullable()
    .describe(
      'Categories of individuals whose data is processed. Allowed values: ' +
        DATA_SUBJECT_TYPES.join(', ')
    ),
  processingRegions: z
    .array(z.string())
    .nullable()
    .describe(
      'List of ISO 3166-1 alpha-2 country codes or named regions (e.g. US, EU, UK) where the vendor processes data.'
    ),
  transferMechanism: z
    .enum(TRANSFER_MECHANISMS)
    .nullable()
    .describe(
      'Legal basis for cross-border personal data transfers. Allowed values: ' +
        TRANSFER_MECHANISMS.join(', ')
    ),
  dpaReference: z
    .string()
    .nullable()
    .describe(
      'A short stable identifier for the Data Processing Agreement (DPA), if the contract is a DPA or references one. Use a URL if there is one, otherwise leave null.'
    ),
  effectiveDate: z
    .string()
    .nullable()
    .describe('Effective date of the agreement in YYYY-MM-DD format. Leave null if not stated.'),
});

export type ContractExtraction = z.infer<typeof contractExtractionSchema>;

/**
 * Allowed PHASES and RISK_TIERS deliberately are NOT part of the extraction
 * schema. Phase is a lifecycle state set by the operator (Draft/Active),
 * and risk tier is an internal severity label that is not derivable from a
 * contract — the staff member must assign it during review.
 */
export const __EXTRACTION_OMITS__ = { PHASES, RISK_TIERS } as const;
