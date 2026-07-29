import type {
  ComMiloapisBillingV1Alpha1BillingAccount,
  ComMiloapisBillingV1Alpha1BillingAccountBinding,
  ComMiloapisBillingV1Alpha1Invoice,
  ComMiloapisBillingV1Alpha1PaymentMethod,
} from '@openapi/billing.miloapis.com/v1alpha1';

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
