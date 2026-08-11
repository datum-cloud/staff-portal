import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingAccountBinding,
  ComMiloapisBillingV1Alpha1Invoice,
  ComMiloapisBillingV1Alpha1PaymentMethod,
  ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';
import type { ComMiloapisServicesV1Alpha1Service } from '@openapi/services.miloapis.com/v1alpha1';

export type Invoice = ComMiloapisBillingV1Alpha1Invoice;
export type InvoicePhase = NonNullable<NonNullable<Invoice['status']>['phase']>;

/** UI status values mapped from Invoice.status.phase for the past-invoices table. */
export type PastInvoiceStatus = 'paid' | 'open' | 'pastDue' | 'void';

/** Row shape rendered by the past-invoices table. */
export type PastInvoiceRow = {
  id: string;
  date: string;
  /** ISO period end — used for sorting. */
  dateSortKey: string;
  amount: string;
  /** Numeric amount for sorting. */
  amountSortKey: number;
  invoiceNumber: string;
  status: PastInvoiceStatus;
  statusLabel: string;
  phase: InvoicePhase | 'Open';
  downloadUrl?: string;
};

const phaseToStatus: Record<InvoicePhase, PastInvoiceStatus> = {
  Paid: 'paid',
  Open: 'open',
  PastDue: 'pastDue',
  Void: 'void',
};

const statusLabels: Record<PastInvoiceStatus, string> = {
  paid: 'Paid',
  open: 'Open',
  pastDue: 'Past due',
  void: 'Void',
};

const formatInvoiceAmount = (
  total: string | undefined,
  currencyCode: string | undefined
): { display: string; sortKey: number } => {
  const amount = Number.parseFloat(total ?? '');
  if (Number.isNaN(amount)) {
    return { display: total ?? '—', sortKey: 0 };
  }
  try {
    return {
      display: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode ?? 'USD',
      }).format(amount),
      sortKey: amount,
    };
  } catch {
    return { display: `${total} ${currencyCode ?? ''}`.trim(), sortKey: amount };
  }
};

const formatInvoiceDate = (iso: string | undefined): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Project an Invoice CRD onto the row shape the past-invoices table renders.
 * Missing phase (provider still projecting) collapses to `open`.
 */
export const toPastInvoiceRow = (invoice: Invoice): PastInvoiceRow => {
  const name = invoice.metadata?.name ?? '';
  const phase = invoice.status?.phase;
  const status = phase ? phaseToStatus[phase] : 'open';
  const periodEnd = invoice.spec?.period?.end ?? '';
  const { display: amount, sortKey: amountSortKey } = formatInvoiceAmount(
    invoice.status?.total,
    invoice.status?.currencyCode
  );
  return {
    id: name,
    invoiceNumber: name,
    date: formatInvoiceDate(periodEnd),
    dateSortKey: periodEnd,
    amount,
    amountSortKey,
    status,
    statusLabel: statusLabels[status],
    phase: phase ?? 'Open',
    downloadUrl: invoice.status?.documentUri,
  };
};

export const getInvoicesForAccount = (invoices: Invoice[], accountName: string): Invoice[] =>
  invoices.filter((invoice) => invoice.spec?.billingAccountRef?.name === accountName);

export const invoiceMatchesSearch = (row: PastInvoiceRow, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.date.toLowerCase().includes(q) ||
    row.amount.toLowerCase().includes(q) ||
    row.invoiceNumber.toLowerCase().includes(q) ||
    row.status.toLowerCase().includes(q) ||
    row.statusLabel.toLowerCase().includes(q) ||
    row.phase.toLowerCase().includes(q)
  );
};

export const BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION = 'kubernetes.io/display-name';

export const getOrganizationDisplayName = (org: {
  metadata?: { name?: string; annotations?: Record<string, string> };
}): string =>
  org.metadata?.annotations?.[BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION] ?? org.metadata?.name ?? '';

export const buildOrganizationNamespace = (orgName: string) => `organization-${orgName}`;

/** Well-known annotation for human-readable Offer names. */
export const OFFER_DISPLAY_NAME_ANNOTATION = 'kubernetes.io/display-name';

/** Namespace where ChargeFanOut emits ServicePricing objects. */
export const DEFAULT_SERVICE_PRICING_NAMESPACE = 'milo-system';

export const getOfferDisplayName = (offer: {
  metadata?: { name?: string; annotations?: Record<string, string> };
}): string =>
  offer.metadata?.annotations?.[OFFER_DISPLAY_NAME_ANNOTATION] || offer.metadata?.name || '';

export type ChargeType = 'Usage' | 'OneTime' | 'Recurring';

export const CHARGE_TYPES: ChargeType[] = ['Usage', 'OneTime', 'Recurring'];

/** Human-readable launch stage labels (GA must stay uppercase). */
export const formatLaunchStage = (stage: string): string => {
  if (stage === 'GA') return 'GA';
  if (stage === 'Draft') return 'Draft';
  return stage;
};

/** Display label for API charge types (e.g. OneTime → "One Time"). */
export const formatChargeType = (chargeType: string): string =>
  chargeType.replace(/([a-z])([A-Z])/g, '$1 $2');

export const formatChargeTypes = (chargeTypes: string[]): string =>
  chargeTypes.map(formatChargeType).join(', ');

function humanizeSlug(slug: string): string {
  return slug
    .split(/[-./]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Primary label for a ServicePricing in staff UI. */
export const getServicePricingDisplayName = (
  pricing: ComMiloapisBillingV1Alpha1ServicePricing
): string => {
  const fromSpec = pricing.spec?.displayName?.trim();
  if (fromSpec) return fromSpec;

  const metric = pricing.spec?.metric?.trim();
  if (metric) {
    const shortMetric = metric.split('/').pop();
    if (shortMetric) return humanizeSlug(shortMetric);
  }

  const resourceName = pricing.metadata?.name ?? '';
  const chargeSlug = resourceName.includes('--')
    ? (resourceName.split('--').pop() ?? resourceName)
    : resourceName;
  return humanizeSlug(chargeSlug);
};

/** Short price summary for checklist rows (e.g. "$0.000001 / request"). */
export const summarizeServicePricing = (
  pricing: ComMiloapisBillingV1Alpha1ServicePricing
): string | undefined => {
  const spec = pricing.spec;
  if (!spec) return undefined;

  if (spec.chargeType === 'OneTime' && spec.amount) {
    return `$${spec.amount} · one-time`;
  }
  if (spec.chargeType === 'Recurring' && spec.amount) {
    return `$${spec.amount} / month`;
  }

  const unit = spec.pricingUnit?.trim();
  const rates = spec.rates ?? [];
  if (rates.length === 0) {
    return unit ? `Per ${unit}` : undefined;
  }

  const parts = rates
    .map((rate) => {
      const match = rate.match ? `${rate.match.dimension}=${rate.match.value}` : null;
      let price: string | null = null;
      if (rate.flat) {
        price = unit ? `$${rate.flat} / ${unit}` : `$${rate.flat}`;
      } else if (rate.tiered?.length) {
        const last = rate.tiered[rate.tiered.length - 1];
        price = unit
          ? `$${last.rate} / ${unit} (${rate.tiered.length} tiers)`
          : `${rate.tiered.length} tiers`;
      }
      if (!price) return null;
      return match ? `${match}: ${price}` : price;
    })
    .filter((part): part is string => Boolean(part));

  if (parts.length === 0) return unit ? `Per ${unit}` : undefined;
  if (parts.length <= 2) return parts.join(' · ');
  return `${parts[0]} · +${parts.length - 1} more`;
};

/** Muted secondary line: internal resource id when it differs from the display label. */
export const getServicePricingSubtext = (
  pricing: ComMiloapisBillingV1Alpha1ServicePricing,
  displayName: string
): string | undefined => getResourceNameSubtext(displayName, pricing.metadata?.name);

export type ServicePricingCatalogService = {
  /** Human-readable Service Catalog name (e.g. Network Services). */
  displayName: string;
  /** metadata.name for linking into Service Catalog. */
  catalogName: string;
  /** Canonical serviceName when useful as secondary context. */
  canonicalName?: string;
};

/** Index services by metadata.name and spec.serviceName for pricing joins. */
export const indexServicesByRef = (
  services: ComMiloapisServicesV1Alpha1Service[]
): Map<string, ComMiloapisServicesV1Alpha1Service> => {
  const map = new Map<string, ComMiloapisServicesV1Alpha1Service>();
  for (const service of services) {
    const catalogName = service.metadata?.name?.trim();
    const canonicalName = service.spec?.serviceName?.trim();
    if (catalogName) map.set(catalogName, service);
    if (canonicalName) map.set(canonicalName, service);
  }
  return map;
};

export const resolveServicePricingCatalogService = (
  pricing: ComMiloapisBillingV1Alpha1ServicePricing,
  servicesByRef: Map<string, ComMiloapisServicesV1Alpha1Service>
): ServicePricingCatalogService | undefined => {
  const serviceRef = pricing.spec?.serviceRef?.trim();
  if (!serviceRef) return undefined;

  const service = servicesByRef.get(serviceRef);
  if (!service) {
    return {
      displayName: humanizeSlug(serviceRef.split('.')[0] ?? serviceRef),
      catalogName: serviceRef,
      canonicalName: serviceRef,
    };
  }

  const catalogName = service.metadata?.name?.trim() ?? serviceRef;
  const displayName = service.spec?.displayName?.trim() || catalogName;
  const canonicalName = service.spec?.serviceName?.trim();
  return {
    displayName,
    catalogName,
    canonicalName: canonicalName && canonicalName !== displayName ? canonicalName : undefined,
  };
};

/** metadata.name of the billing.miloapis.com Service / ServiceConfiguration. */
export const BILLING_SERVICE_CONFIGURATION_NAME = 'billing-miloapis-com';

export const orgNameFromNamespace = (namespace?: string): string => {
  if (!namespace) return '';
  const prefix = 'organization-';
  return namespace.startsWith(prefix) ? namespace.slice(prefix.length) : namespace;
};

export const getBillingAccountDisplayName = (
  account: ComMiloapisBillingV1Alpha1BillingAccount
): string =>
  account.metadata?.annotations?.[BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION] ??
  account.spec?.contactInfo?.businessName ??
  account.spec?.contactInfo?.name ??
  account.metadata?.name ??
  'Unnamed billing account';

/** Prefer human label; fall back to the k8s resource name. */
export const getPaymentMethodDisplayName = (
  method: ComMiloapisBillingV1Alpha1PaymentMethod
): string => method.spec?.displayName?.trim() || method.metadata?.name || 'Unnamed payment method';

/**
 * Resource name to show as muted subtext under a display name.
 * Returns undefined when it would duplicate the primary label.
 */
export const getResourceNameSubtext = (
  displayName: string,
  resourceName: string | undefined
): string | undefined => {
  const name = resourceName?.trim();
  if (!name || name === displayName) return undefined;
  return name;
};

export const isDefaultPaymentMethod = (
  method: ComMiloapisBillingV1Alpha1PaymentMethod,
  account: ComMiloapisBillingV1Alpha1BillingAccount | undefined
): boolean => account?.spec?.defaultPaymentMethodRef?.name === method.metadata?.name;

export const getPaymentMethodsForAccount = (
  methods: ComMiloapisBillingV1Alpha1PaymentMethod[],
  accountName: string,
  namespace?: string
): ComMiloapisBillingV1Alpha1PaymentMethod[] =>
  methods.filter((method) => {
    if (method.spec?.billingAccountRef?.name !== accountName) return false;
    if (namespace && method.metadata?.namespace && method.metadata.namespace !== namespace) {
      return false;
    }
    return true;
  });

/**
 * Formats payment-method failure for Status tooltips.
 * Prefers the human-readable failureMessage from the provider.
 */
export const formatPaymentMethodFailureTooltip = (
  method: ComMiloapisBillingV1Alpha1PaymentMethod
): string => {
  const message =
    method.status?.failureMessage?.trim() || method.status?.failureReason?.trim() || '';
  return message ? `Provider error: ${message}` : 'Provider error';
};

/**
 * Critical payment failure: the sole PM is Failed, or (with multiple PMs) the default is Failed.
 * Non-default failures when other PMs exist are not critical.
 */
export const getCriticalFailedPaymentMethod = (
  account: ComMiloapisBillingV1Alpha1BillingAccount,
  paymentMethods: ComMiloapisBillingV1Alpha1PaymentMethod[]
): ComMiloapisBillingV1Alpha1PaymentMethod | undefined => {
  const accountName = account.metadata?.name;
  if (!accountName) return undefined;

  const methods = getPaymentMethodsForAccount(
    paymentMethods,
    accountName,
    account.metadata?.namespace
  );
  if (methods.length === 0) return undefined;

  if (methods.length === 1) {
    return methods[0].status?.phase === 'Failed' ? methods[0] : undefined;
  }

  const defaultMethod = methods.find((method) => isDefaultPaymentMethod(method, account));
  return defaultMethod?.status?.phase === 'Failed' ? defaultMethod : undefined;
};

export const billingAccountHasCriticalPaymentFailure = (
  account: ComMiloapisBillingV1Alpha1BillingAccount,
  paymentMethods: ComMiloapisBillingV1Alpha1PaymentMethod[]
): boolean => Boolean(getCriticalFailedPaymentMethod(account, paymentMethods));

export type BillingAccountDisplayStatus = {
  state: string;
  tooltip?: string;
};

/** Prefer Failed when payment failure is critical; otherwise the account phase. */
export const getBillingAccountDisplayStatus = (
  account: ComMiloapisBillingV1Alpha1BillingAccount,
  paymentMethods: ComMiloapisBillingV1Alpha1PaymentMethod[]
): BillingAccountDisplayStatus => {
  const failedMethod = getCriticalFailedPaymentMethod(account, paymentMethods);
  if (failedMethod) {
    return {
      state: 'Failed',
      tooltip: formatPaymentMethodFailureTooltip(failedMethod),
    };
  }
  return { state: account.status?.phase ?? 'Unknown' };
};

export const getActiveProjectBinding = (
  bindings: ComMiloapisBillingV1Alpha1BillingAccountBinding[],
  projectName: string
): ComMiloapisBillingV1Alpha1BillingAccountBinding | undefined =>
  bindings.find(
    (binding) =>
      binding.spec?.projectRef?.name === projectName &&
      (!binding.status?.phase || binding.status.phase === 'Active')
  );

export const getActiveBindingsForAccount = (
  bindings: ComMiloapisBillingV1Alpha1BillingAccountBinding[],
  accountName: string
): ComMiloapisBillingV1Alpha1BillingAccountBinding[] =>
  bindings.filter(
    (binding) =>
      binding.spec?.billingAccountRef?.name === accountName &&
      (!binding.status?.phase || binding.status.phase === 'Active')
  );

export const formatBillingAddress = (
  address: NonNullable<
    NonNullable<ComMiloapisBillingV1Alpha1BillingAccount['spec']>['contactInfo']
  >['address']
): string => {
  if (!address) return '';
  return [
    address.line1,
    address.line2,
    [address.city, address.region].filter(Boolean).join(', '),
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join('\n');
};
