import {
  CONTRACT_BILLING_ACCOUNT_LABEL,
  CONTRACT_ORGANIZATION_LABEL,
  contractOfferPlan,
  contractResourceNames,
} from '@/features/billing/lib/contract';
import type { OfferDiscount } from '@/features/billing/lib/offer-discounts';
import type {
  ArrangementMergePatch,
  BillingArrangementSpec,
} from '@/features/billing/lib/payment-terms';
import type { BillingArrangementDeclineSpec } from '@/features/billing/lib/payment-terms-applications';
import {
  buildOrganizationNamespace,
  DEFAULT_SERVICE_PRICING_NAMESPACE,
} from '@/features/billing/utils';
import { PROXY_URL } from '@/modules/axios/axios.client';
import { ListQueryParams } from '@/resources/schemas';
import { walkCursorPages } from '@/utils/helpers';
import {
  createBillingMiloapisComV1Alpha1NamespacedBillingArrangement,
  createBillingMiloapisComV1Alpha1NamespacedBillingArrangementDecline,
  createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest,
  createBillingMiloapisComV1Alpha1NamespacedServicePricing,
  createBillingMiloapisComV1Alpha1Offer,
  listBillingMiloapisComV1Alpha1BillingAccountBindingForAllNamespaces,
  listBillingMiloapisComV1Alpha1BillingAccountForAllNamespaces,
  listBillingMiloapisComV1Alpha1BillingArrangementApplicationForAllNamespaces,
  listBillingMiloapisComV1Alpha1NamespacedBillingAccount,
  listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding,
  listBillingMiloapisComV1Alpha1NamespacedBillingArrangement,
  listBillingMiloapisComV1Alpha1NamespacedBillingArrangementApplication,
  listBillingMiloapisComV1Alpha1NamespacedBillingArrangementDecline,
  listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement,
  listBillingMiloapisComV1Alpha1NamespacedInvoice,
  listBillingMiloapisComV1Alpha1NamespacedPaymentMethod,
  listBillingMiloapisComV1Alpha1NamespacedServicePricing,
  listBillingMiloapisComV1Alpha1Offer,
  listBillingMiloapisComV1Alpha1PaymentMethodForAllNamespaces,
  patchBillingMiloapisComV1Alpha1NamespacedBillingArrangement,
  patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement,
  patchBillingMiloapisComV1Alpha1Offer,
  readBillingMiloapisComV1Alpha1NamespacedBillingAccount,
  readBillingMiloapisComV1Alpha1NamespacedBillingArrangementApplication,
  readBillingMiloapisComV1Alpha1NamespacedInvoiceRequest,
  readBillingMiloapisComV1Alpha1Offer,
  type ComMiloapisBillingV1Alpha1BillingEntitlement,
  type ComMiloapisBillingV1Alpha1Invoice,
  type ComMiloapisBillingV1Alpha1InvoiceRequest,
  type ComMiloapisBillingV1Alpha1Offer,
  type ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';

const FIELD_MANAGER = 'datum-staff-portal';

const getClientOrgControlPlaneBaseURL = (orgName: string) =>
  `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}/control-plane`;

const filterNotDeleting = <T extends { metadata?: { deletionTimestamp?: string } }>(items: T[]) =>
  items.filter((item) => !item.metadata?.deletionTimestamp);

export type Offer = ComMiloapisBillingV1Alpha1Offer;
export type OfferSpec = NonNullable<Offer['spec']>;
export type ServicePricing = ComMiloapisBillingV1Alpha1ServicePricing;
export type BillingEntitlement = ComMiloapisBillingV1Alpha1BillingEntitlement;
export type Invoice = ComMiloapisBillingV1Alpha1Invoice;
export type InvoiceRequest = ComMiloapisBillingV1Alpha1InvoiceRequest;

export const billingAccountListQuery = async (params?: ListQueryParams) => {
  const response = await listBillingMiloapisComV1Alpha1BillingAccountForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

export const billingAccountListForOrgQuery = async (orgName: string, params?: ListQueryParams) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedBillingAccount({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

export const billingAccountDetailQuery = async (orgName: string, accountName: string) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await readBillingMiloapisComV1Alpha1NamespacedBillingAccount({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace, name: accountName },
  });
  return response.data?.data;
};

export const billingAccountBindingListQuery = async (params?: ListQueryParams) => {
  const response = await listBillingMiloapisComV1Alpha1BillingAccountBindingForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

export const billingAccountBindingListForOrgQuery = async (
  orgName: string,
  params?: ListQueryParams
) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

export const paymentMethodListForOrgQuery = async (orgName: string, params?: ListQueryParams) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedPaymentMethod({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

// ─── Invoices (org-namespaced) ───────────────────────────────────────────────

const INVOICE_PAGE_LIMIT = 500;
// Safety net against a runaway walk, as for applications.
const INVOICE_MAX_PAGES = 20;

const invoiceListPageForOrgQuery = async (orgName: string, params?: ListQueryParams) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedInvoice({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

/**
 * Every invoice in the organization, walking the `continue` cursor so an
 * account's balance and aging don't drop invoices past one page.
 */
export const invoiceListForOrgQuery = (
  orgName: string
): Promise<{ items: Invoice[]; hasMore: boolean }> =>
  walkCursorPages(
    async (cursor) => {
      const page = await invoiceListPageForOrgQuery(orgName, {
        limit: INVOICE_PAGE_LIMIT,
        cursor,
      });
      return { items: page.items, continueToken: page.metadata?.continue };
    },
    { maxPages: INVOICE_MAX_PAGES }
  );

/** Cluster-wide payment methods — used to surface Failed status on billing/org lists. */
export const paymentMethodListQuery = async (params?: ListQueryParams) => {
  const response = await listBillingMiloapisComV1Alpha1PaymentMethodForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

// ─── Offers (cluster-scoped) ─────────────────────────────────────────────────

export const offerListQuery = async (params?: ListQueryParams) => {
  const response = await listBillingMiloapisComV1Alpha1Offer({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

export const offerDetailQuery = async (name: string): Promise<Offer | null> => {
  const response = await readBillingMiloapisComV1Alpha1Offer({
    path: { name },
  });
  return response.data?.data ?? null;
};

export type CreateOfferInput = {
  name: string;
  displayName?: string;
  chargeTypes: NonNullable<OfferSpec['chargeTypes']>;
  servicePricingRefs: NonNullable<OfferSpec['servicePricingRefs']>;
  /** General discount; per-service overrides go on servicePricingRefs. */
  discount?: OfferDiscount;
  labels?: Record<string, string>;
};

export const createOffer = async (input: CreateOfferInput) => {
  const annotations: Record<string, string> = {};
  if (input.displayName?.trim()) {
    annotations['kubernetes.io/display-name'] = input.displayName.trim();
  }
  const response = await createBillingMiloapisComV1Alpha1Offer({
    body: {
      apiVersion: 'billing.miloapis.com/v1alpha1',
      kind: 'Offer',
      metadata: {
        name: input.name,
        ...(Object.keys(annotations).length > 0 ? { annotations } : {}),
        ...(input.labels ? { labels: input.labels } : {}),
      },
      spec: {
        launchStage: 'Draft',
        chargeTypes: input.chargeTypes,
        servicePricingRefs: input.servicePricingRefs,
        ...(input.discount ? { discount: input.discount } : {}),
      },
    },
  });
  return response.data?.data;
};

export type PatchOfferInput = {
  name: string;
  body: {
    metadata?: { annotations?: Record<string, string> };
    // Merge patch: a null discount removes it.
    spec?: Partial<Omit<OfferSpec, 'discount'>> & { discount?: OfferDiscount | null };
  };
};

export const patchOffer = async ({ name, body }: PatchOfferInput) => {
  const response = await patchBillingMiloapisComV1Alpha1Offer({
    path: { name },
    query: { fieldManager: FIELD_MANAGER },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body,
  });
  return response.data?.data;
};

export const publishOffer = async (name: string) =>
  patchOffer({
    name,
    body: { spec: { launchStage: 'GA' } },
  });

export const updateOfferDisplayName = async (name: string, displayName: string) =>
  patchOffer({
    name,
    body: {
      metadata: {
        annotations: {
          'kubernetes.io/display-name': displayName,
        },
      },
    },
  });

export const updateDraftOffer = async (
  name: string,
  input: {
    displayName?: string;
    chargeTypes: NonNullable<OfferSpec['chargeTypes']>;
    servicePricingRefs: NonNullable<OfferSpec['servicePricingRefs']>;
    discount?: OfferDiscount;
  }
) => {
  const annotations: Record<string, string> = {};
  if (input.displayName?.trim()) {
    annotations['kubernetes.io/display-name'] = input.displayName.trim();
  }
  return patchOffer({
    name,
    body: {
      ...(Object.keys(annotations).length > 0 ? { metadata: { annotations } } : {}),
      spec: {
        chargeTypes: input.chargeTypes,
        // Merge patch replaces the whole array, so cleared per-service
        // overrides go with it; a cleared general discount is sent as null.
        servicePricingRefs: input.servicePricingRefs,
        discount: input.discount ?? null,
      },
    },
  });
};
// ─── ServicePricing (milo-system) ────────────────────────────────────────────

export const servicePricingListQuery = async (
  namespace: string = DEFAULT_SERVICE_PRICING_NAMESPACE,
  params?: ListQueryParams
) => {
  const response = await listBillingMiloapisComV1Alpha1NamespacedServicePricing({
    path: { namespace },
    query: {
      limit: params?.limit ?? 500,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

export type CreateFixedServicePricingInput = {
  name: string;
  /** Shown on invoices, e.g. "Server installation". */
  displayName: string;
  chargeType: 'OneTime' | 'Recurring';
  /** USD decimal string, e.g. "1500.00". */
  amount: string;
  /** The catalog service's serviceName the fee is for. */
  serviceRef: string;
  labels?: Record<string, string>;
};

/**
 * A one-time or monthly fee, such as a contract's. Pricings are immutable,
 * so a new fee is always a new pricing.
 */
export const createFixedServicePricing = async (input: CreateFixedServicePricingInput) => {
  const response = await createBillingMiloapisComV1Alpha1NamespacedServicePricing({
    path: { namespace: DEFAULT_SERVICE_PRICING_NAMESPACE },
    query: { fieldManager: FIELD_MANAGER },
    body: {
      apiVersion: 'billing.miloapis.com/v1alpha1',
      kind: 'ServicePricing',
      metadata: { name: input.name, ...(input.labels ? { labels: input.labels } : {}) },
      spec: {
        chargeType: input.chargeType,
        currency: 'USD',
        displayName: input.displayName,
        amount: input.amount,
        serviceRef: input.serviceRef,
        ...(input.chargeType === 'OneTime'
          ? { trigger: 'BillingAccountActivation' as const }
          : { interval: 'monthly' as const }),
      },
    },
  });
  return response.data?.data;
};

// ─── Contracts ───────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits for billing to snapshot a published Offer's pricings, which it does
 * after the Offer goes GA. An entitlement can't point at the Offer before.
 */
export const waitForOfferSnapshot = async (
  name: string,
  pricingCount: number,
  { attempts = 30, intervalMs = 1000 } = {}
): Promise<Offer> => {
  for (let i = 0; i < attempts; i++) {
    const offer = await offerDetailQuery(name);
    if (offer && (offer.spec?.servicePricings?.length ?? 0) >= pricingCount) return offer;
    await sleep(intervalMs);
  }
  throw new Error(`Offer ${name} wasn't published in time. Try assigning it again shortly.`);
};

export type ContractFeeInput = {
  /** Shown on invoices, e.g. "Dedicated servers". */
  label: string;
  chargeType: 'OneTime' | 'Recurring';
  /** USD decimal string, e.g. "1000.00". */
  amount: string;
  /** The catalog service's serviceName the fee is for. */
  serviceRef: string;
};

export type CreateContractOfferInput = {
  orgName: string;
  accountName: string;
  /** Names the Offer, e.g. "Acme Corp contract". */
  displayName: string;
  /**
   * The contract's fees, each its own pricing and invoice line. Leave out
   * one-time fees when amending a started contract: they'd be charged again.
   */
  fees: ContractFeeInput[];
  /** Usage pricings billed alongside the fees, if any. */
  usageRefs: NonNullable<OfferSpec['servicePricingRefs']>;
};

/**
 * Creates a contract's fee pricings and a published Offer with them, and
 * returns the Offer's name once an entitlement can point at it.
 */
export const createContractOffer = async (input: CreateContractOfferInput, now = new Date()) => {
  const names = contractResourceNames(input.accountName, now);
  const labels = {
    [CONTRACT_BILLING_ACCOUNT_LABEL]: input.accountName,
    [CONTRACT_ORGANIZATION_LABEL]: input.orgName,
  };
  const fees = input.fees.map((fee, index) => ({ ...fee, name: names.fee(index) }));
  for (const fee of fees) {
    await createFixedServicePricing({
      name: fee.name,
      displayName: fee.label,
      chargeType: fee.chargeType,
      amount: fee.amount,
      serviceRef: fee.serviceRef,
      labels,
    });
  }
  const plan = contractOfferPlan({
    namespace: DEFAULT_SERVICE_PRICING_NAMESPACE,
    fees,
    usageRefs: input.usageRefs,
  });
  await createOffer({ name: names.offer, displayName: input.displayName, labels, ...plan });
  await publishOffer(names.offer);
  await waitForOfferSnapshot(names.offer, plan.servicePricingRefs.length);
  return names.offer;
};

// ─── BillingEntitlement (org-namespaced) ─────────────────────────────────────

export const billingEntitlementListForOrgQuery = async (
  orgName: string,
  params?: ListQueryParams
) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

export const billingEntitlementForAccountQuery = async (
  orgName: string,
  accountName: string
): Promise<BillingEntitlement | null> => {
  const list = await billingEntitlementListForOrgQuery(orgName, { limit: 500 });
  return list.items.find((be) => be.spec?.billingAccountRef?.name === accountName) ?? null;
};

export const switchBillingEntitlementOffer = async (
  orgName: string,
  entitlementName: string,
  offerName: string
) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace, name: entitlementName },
    query: { fieldManager: FIELD_MANAGER },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: {
      spec: {
        offerRef: { name: offerName },
      },
    },
  });
  return response.data?.data;
};

/**
 * Moves the account onto a contract: its Offer, starting at midnight UTC on
 * startsAt. Until then the account is billed as before. The contract can't
 * be removed or its start moved afterwards.
 */
export const setBillingEntitlementContract = async (
  orgName: string,
  entitlementName: string,
  offerName: string,
  startsAt: string
) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace, name: entitlementName },
    query: { fieldManager: FIELD_MANAGER },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: {
      spec: {
        offerRef: { name: offerName },
        contract: { startsAt },
      },
    },
  });
  return response.data?.data;
};

// ─── InvoiceRequest (org-namespaced, staff-only) ─────────────────────────────

/** Asks the invoicing provider what the account will be invoiced next. */
export const createInvoicePreviewRequest = async (orgName: string, accountName: string) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    query: { fieldManager: FIELD_MANAGER },
    body: {
      apiVersion: 'billing.miloapis.com/v1alpha1',
      kind: 'InvoiceRequest',
      metadata: { generateName: `${accountName}-preview-` },
      spec: { billingAccountRef: { name: accountName }, mode: 'Preview' },
    },
  });
  return response.data?.data;
};

/**
 * Creates a Preview request and waits for the provider to answer it.
 * Returns the request as it finished, Succeeded or Failed.
 */
export const previewNextInvoice = async (
  orgName: string,
  accountName: string,
  { attempts = 45, intervalMs = 2000 } = {}
): Promise<InvoiceRequest> => {
  const created = await createInvoicePreviewRequest(orgName, accountName);
  const name = created?.metadata?.name;
  if (!name) throw new Error('The preview request was not created.');
  for (let i = 0; i < attempts; i++) {
    const request = await invoiceRequestDetailQuery(orgName, name);
    const phase = request?.status?.phase;
    if (request && (phase === 'Succeeded' || phase === 'Failed')) return request;
    await sleep(intervalMs);
  }
  throw new Error('The billing provider has not answered the preview yet. Try again shortly.');
};

export const invoiceRequestDetailQuery = async (
  orgName: string,
  name: string
): Promise<InvoiceRequest | null> => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await readBillingMiloapisComV1Alpha1NamespacedInvoiceRequest({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace, name },
  });
  return response.data?.data ?? null;
};

// ─── BillingArrangement (org-namespaced, staff-only) ─────────────────────────

export const billingArrangementListForOrgQuery = async (
  orgName: string,
  params?: ListQueryParams
) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedBillingArrangement({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

export const createBillingArrangement = async (orgName: string, spec: BillingArrangementSpec) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await createBillingMiloapisComV1Alpha1NamespacedBillingArrangement({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    query: { fieldManager: FIELD_MANAGER },
    body: {
      apiVersion: 'billing.miloapis.com/v1alpha1',
      kind: 'BillingArrangement',
      metadata: { generateName: `${spec.billingAccountRef.name}-terms-` },
      spec,
    },
  });
  return response.data?.data;
};

export const patchBillingArrangement = async (
  orgName: string,
  arrangementName: string,
  body: ArrangementMergePatch
) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await patchBillingMiloapisComV1Alpha1NamespacedBillingArrangement({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace, name: arrangementName },
    query: { fieldManager: FIELD_MANAGER },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    // Merge patch uses null to remove optional fields, which the generated
    // body type (the full resource) doesn't allow for.
    body: body as never,
  });
  return response.data?.data;
};

// ─── Payment terms applications (customer-created, staff-decided) ───────────

/** Every organization's applications, for the review queue. */
export const billingArrangementApplicationListQuery = async (params?: ListQueryParams) => {
  const response =
    await listBillingMiloapisComV1Alpha1BillingArrangementApplicationForAllNamespaces({
      query: {
        limit: params?.limit,
        continue: params?.cursor,
      },
    });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

const ALL_APPLICATIONS_PAGE_LIMIT = 500;
// Safety net against a runaway walk, as for organizations and users.
const ALL_APPLICATIONS_MAX_PAGES = 20;

/**
 * Every organization's applications, walking the `continue` cursor so the
 * review queue and its pending count don't drop rows past one page.
 */
export const listAllBillingArrangementApplications = () =>
  walkCursorPages(
    async (cursor) => {
      const page = await billingArrangementApplicationListQuery({
        limit: ALL_APPLICATIONS_PAGE_LIMIT,
        cursor,
      });
      return { items: page.items, continueToken: page.metadata?.continue };
    },
    { maxPages: ALL_APPLICATIONS_MAX_PAGES }
  );

export const billingArrangementApplicationListForOrgQuery = async (
  orgName: string,
  params?: ListQueryParams
) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedBillingArrangementApplication({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

export const billingArrangementApplicationDetailQuery = async (
  orgName: string,
  applicationName: string
) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await readBillingMiloapisComV1Alpha1NamespacedBillingArrangementApplication({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace, name: applicationName },
  });
  return response.data?.data;
};

export const billingArrangementDeclineListForOrgQuery = async (
  orgName: string,
  params?: ListQueryParams
) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedBillingArrangementDecline({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const data = response.data?.data;
  return {
    ...(data ?? { items: [] }),
    items: filterNotDeleting(data?.items ?? []),
  };
};

export const createBillingArrangementDecline = async (
  orgName: string,
  spec: BillingArrangementDeclineSpec
) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await createBillingMiloapisComV1Alpha1NamespacedBillingArrangementDecline({
    baseURL: getClientOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    query: { fieldManager: FIELD_MANAGER },
    body: {
      apiVersion: 'billing.miloapis.com/v1alpha1',
      kind: 'BillingArrangementDecline',
      metadata: { generateName: `${spec.applicationRef.name}-decline-` },
      spec,
    },
  });
  return response.data?.data;
};
