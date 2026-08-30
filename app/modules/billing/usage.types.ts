export interface MeterPoint {
  timestamp: number;
  value: number;
}

/** One grouped series within a dimension breakdown (e.g. region=us-east-1). */
export interface MeterBreakdownSeries {
  /** The dimension value this series belongs to (e.g. `us-east-1`, `claude`). */
  groupValue: string;
  values: MeterPoint[];
}

/** All grouped series for a single dimension of a meter. */
export interface MeterDimensionBreakdown {
  dimension: string;
  series: MeterBreakdownSeries[];
}

export interface MeterSeries {
  /** Amberflo meterApiName (`MeterDefinition.metadata.name`, hashed if >50 chars). */
  meterApiName: string;
  /** Canonical meter name from `MeterDefinition.spec.meterName`. */
  meterName?: string;
  label: string;
  values: MeterPoint[];
  /** Plain-English explanation from `MeterDefinition.spec.description`. */
  description?: string;
  /** UCUM unit from `MeterDefinition.spec.measurement.unit` (e.g. `By`, `s`). */
  unit?: string;
  /** Rollup function from `MeterDefinition.spec.measurement.aggregation`. */
  aggregation?: string;
  /** Group-by keys from `MeterDefinition.spec.measurement.dimensions`. */
  dimensions?: string[];
  /** Owning service group id, e.g. `compute.miloapis.com`. */
  groupId?: string;
  /** Human-readable group title, e.g. `Compute`. */
  groupTitle?: string;
  /**
   * Optional usage ceiling for the period. Unused today — billing has no
   * usage caps; resource quotas live on AllowanceBucket / Quotas UI.
   */
  limit?: number;
  /** Optional pre-aggregated used amount; otherwise sum of `values`. */
  used?: number;
  /** Period spend estimated from catalog Offer rates × usage. */
  spend?: number;
  /** Unit rate from the active Offer, when available. */
  unitRate?: number;
  /** Billing pricing unit label from the Offer, e.g. `token`, `request`, `GB`. */
  pricingUnit?: string;
  /** Per-dimension grouped series, fetched when the meter declares dimensions. */
  breakdowns?: MeterDimensionBreakdown[];
}

export interface MeterDefinition {
  /** Amberflo meterApiName (`MeterDefinition.metadata.name`, hashed if >50 chars). */
  meterApiName: string;
  /** Canonical meter name from `MeterDefinition.spec.meterName`. */
  meterName: string;
  displayName: string;
  description?: string;
  unit?: string;
  aggregation?: string;
  dimensions?: string[];
  monitoredResourceTypes?: string[];
}

/** A service-scoped grouping of meters surfaced in the usage dashboard. */
export interface UsageGroup {
  id: string;
  title: string;
  meterApiNames: string[];
}

export type UsageFetchStatus =
  | 'ok'
  | 'unconfigured'
  | 'insufficient-permissions'
  | 'no-billing-account';

export interface UsageFetchResult {
  status: UsageFetchStatus;
  meters: MeterSeries[];
  /** Meters bucketed by owning service, in display order. */
  groups?: UsageGroup[];
  days: number;
  message?: string;
  /** When set, usage is scoped to a single project's billing binding. */
  projectId?: string;
  /** Total period spend across meters (catalog estimate). */
  totalSpend?: number;
  /** ISO 4217 currency for spend fields. */
  currencyCode?: string;
  /** Offer whose snapshotted rates were used for spend estimates. */
  pricingOfferName?: string;
}

export interface UsageBillingCycleOption {
  value: 'current' | 'previous';
  label: string;
}

/** Payload returned by `GET /api/usage/dashboard` and `loadOrgUsageDashboard`. */
export interface OrgUsageDashboardData {
  usage: UsageFetchResult;
  selectedProject: string;
  billingCycles: UsageBillingCycleOption[];
  selectedBillingCycle: 'current' | 'previous';
}
