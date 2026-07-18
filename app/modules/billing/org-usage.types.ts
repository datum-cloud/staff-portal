export type OrgUsageStatus =
  | 'ok'
  | 'unconfigured'
  | 'insufficient-permissions'
  | 'no-billing-account'
  | 'no-meters';

export interface OrgUsageMeterSummary {
  meterApiName: string;
  label: string;
  /** UCUM unit from MeterDefinition, when available. */
  unit?: string;
  used: number;
  /** 0 when no matching AllowanceBucket / unlimited. */
  limit: number;
}

export interface OrgUsageSummary {
  status: OrgUsageStatus;
  /** Short cycle range, e.g. `1 Jun - 1 Jul 2026`. */
  cycleRangeLabel: string;
  /** Full picker-style label. */
  cycleLabel: string;
  meters: OrgUsageMeterSummary[];
  message?: string;
}
