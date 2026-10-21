import type { UsageSpend } from './usage.types';

export type OrgUsageStatus = 'ok' | 'insufficient-permissions' | 'no-billing-account' | 'no-meters';

export interface OrgUsageMeterSummary {
  meterDefinition: string;
  label: string;
  /** UCUM unit from MeterDefinition, when available. */
  unit?: string;
  /** Rollup function, e.g. `Sum` or `Latest`. */
  aggregation?: string;
  used: number;
  /** 0 when no matching AllowanceBucket / unlimited. */
  limit: number;
  /** What the usage costs, from `UsageQuery`. */
  spend?: UsageSpend;
  /** Why `spend` could not be computed. */
  spendError?: string;
}

export interface OrgUsageSummary {
  status: OrgUsageStatus;
  /** Short cycle range, e.g. `1 Jun - 1 Jul 2026`. */
  cycleRangeLabel: string;
  /** Full picker-style label. */
  cycleLabel: string;
  meters: OrgUsageMeterSummary[];
  /** What all the usage costs together, from `UsageQuery`. */
  spend?: UsageSpend;
  /** Why `spend` is left out. */
  spendError?: string;
  message?: string;
}
