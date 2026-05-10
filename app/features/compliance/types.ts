import type {
  Subprocessor,
  Vendor,
  VendorSpec,
} from '@/resources/request/client/apis/compliance.api';

export type { Subprocessor, Vendor, VendorSpec };

export const DATA_CATEGORIES = [
  'identity',
  'authentication',
  'telemetry',
  'billing',
  'user-content',
  'access-logs',
  'audit-trail',
] as const;

export const DATA_SUBJECT_TYPES = ['organization-admin', 'consumer', 'platform-staff'] as const;

export const PHASES = ['Draft', 'Active'] as const;

export const TRANSFER_MECHANISMS = ['SCCs', 'AdequacyDecision', 'BCRs'] as const;

export const RISK_TIERS = ['Low', 'Medium', 'High', 'Critical'] as const;

export type DataCategory = (typeof DATA_CATEGORIES)[number];
export type DataSubjectType = (typeof DATA_SUBJECT_TYPES)[number];
export type Phase = (typeof PHASES)[number];
export type TransferMechanism = (typeof TRANSFER_MECHANISMS)[number];
export type RiskTier = (typeof RISK_TIERS)[number];
