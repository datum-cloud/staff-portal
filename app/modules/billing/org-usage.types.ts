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
  /** Period spend from Amberflo usage-cost, when priced. */
  spend?: number;
}

export interface OrgUsageSummary {
  status: OrgUsageStatus;
  /** Short cycle range, e.g. `1 Jun - 1 Jul 2026`. */
  cycleRangeLabel: string;
  /** Full picker-style label. */
  cycleLabel: string;
  meters: OrgUsageMeterSummary[];
  /** Total period spend across meters (Amberflo usage-cost). */
  totalSpend?: number;
  /** ISO 4217 currency for spend fields. */
  currencyCode?: string;
  message?: string;
}
