import {
  CONTRACT_BILLING_ACCOUNT_LABEL,
  CONTRACT_ORGANIZATION_LABEL,
  CONTRACT_STARTS_AT_ANNOTATION,
  contractOfferPlan,
  contractResourceNames,
  draftPublishProblem,
  getContractState,
  isContractDraft,
  type DraftPublishProblem,
  type FeeBillingTiming,
  type FeeInterval,
} from '@/features/billing/lib/contract';
import type { UsagePlan } from '@/features/billing/lib/contract-usage';
import type { OfferDiscount } from '@/features/billing/lib/offer-discounts';
import type {
  ArrangementMergePatch,
  BillingArrangementSpec,
} from '@/features/billing/lib/payment-terms';
import type { BillingArrangementDeclineSpec } from '@/features/billing/lib/payment-terms-applications';
import type { BillingEntitlement, Invoice, InvoiceRequest } from '@/features/billing/utils';
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
  createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement,
  createBillingMiloapisComV1Alpha1NamespacedInvoiceRequest,
  createBillingMiloapisComV1Alpha1NamespacedServicePricing,
  createBillingMiloapisComV1Alpha1Offer,
  deleteBillingMiloapisComV1Alpha1NamespacedServicePricing,
  deleteBillingMiloapisComV1Alpha1Offer,
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
  type ComMiloapisBillingV1Alpha1Offer,
  type ComMiloapisBillingV1Alpha1ServicePricing,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { isAxiosError } from 'axios';

const FIELD_MANAGER = 'datum-staff-portal';

const getClientOrgControlPlaneBaseURL = (orgName: string) =>
  `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}/control-plane`;

const filterNotDeleting = <T extends { metadata?: { deletionTimestamp?: string } }>(items: T[]) =>
  items.filter((item) => !item.metadata?.deletionTimestamp);

export type Offer = ComMiloapisBillingV1Alpha1Offer;
export type OfferSpec = NonNullable<Offer['spec']>;
export type ServicePricing = ComMiloapisBillingV1Alpha1ServicePricing;
type ServicePricingSpec = NonNullable<ServicePricing['spec']>;
// One set of billing aliases, defined with the billing feature.
export type { BillingEntitlement, Invoice, InvoiceRequest };

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
  /** More annotations, beside the display name. */
  annotations?: Record<string, string>;
};

export const createOffer = async (input: CreateOfferInput) => {
  const annotations: Record<string, string> = { ...input.annotations };
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
    // Merge patch: a null annotation or discount removes it.
    metadata?: { annotations?: Record<string, string | null> };
    spec?: Partial<Omit<OfferSpec, 'discount'>> & { discount?: OfferDiscount | null };
  };
};

export const patchOffer = async ({ name, body }: PatchOfferInput) => {
  const response = await patchBillingMiloapisComV1Alpha1Offer({
    path: { name },
    query: { fieldManager: FIELD_MANAGER },
    headers: { 'Content-Type': 'application/merge-patch+json' },
    // The generated body type (the full resource) doesn't allow null.
    body: body as never,
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
  /** The catalog service's serviceName the fee is for, if it's for one. */
  serviceRef?: string;
  /** What the amount is per, e.g. "port", if the fee has a unit. */
  pricingUnit?: string;
  /** How often a recurring fee is charged; monthly when unset. */
  interval?: FeeInterval;
  /**
   * The list fee this is the customer's own amount for. It must match it
   * in everything but the amount and name, which billing checks.
   */
  basedOn?: string;
  labels?: Record<string, string>;
};

/**
 * A one-time or recurring fee, such as a contract's: a recurring one is
 * charged monthly, quarterly or annually. Pricings are immutable, so a new
 * fee is always a new pricing.
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
        ...(input.serviceRef ? { serviceRef: input.serviceRef } : {}),
        ...(input.pricingUnit ? { pricingUnit: input.pricingUnit } : {}),
        ...(input.basedOn ? { basedOn: input.basedOn } : {}),
        ...(input.chargeType === 'OneTime'
          ? { trigger: 'BillingAccountActivation' as const }
          : { interval: input.interval ?? ('monthly' as const) }),
      },
    },
  });
  return response.data?.data;
};

/**
 * A customer's own usage rates: a Usage pricing based on a list pricing,
 * differing from it only in its rate amounts, which billing checks.
 */
export const createCustomerUsagePricing = async (input: {
  name: string;
  spec: ServicePricingSpec;
  labels?: Record<string, string>;
}) => {
  const response = await createBillingMiloapisComV1Alpha1NamespacedServicePricing({
    path: { namespace: DEFAULT_SERVICE_PRICING_NAMESPACE },
    query: { fieldManager: FIELD_MANAGER },
    body: {
      apiVersion: 'billing.miloapis.com/v1alpha1',
      kind: 'ServicePricing',
      metadata: { name: input.name, ...(input.labels ? { labels: input.labels } : {}) },
      spec: input.spec,
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
  /** Shown on invoices, e.g. "Dedicated server". */
  label: string;
  chargeType: 'OneTime' | 'Recurring';
  /** The unit amount, as a USD decimal string, e.g. "1000.00". */
  amount: string;
  /** How many of the fee the contract charges. */
  quantity: number;
  /** What the amount is per, e.g. "port", if the fee has a unit. */
  pricingUnit?: string;
  /** The catalog service's serviceName the fee is for, if it's for one. */
  serviceRef?: string;
  /**
   * An existing pricing that already charges this fee, such as a list fee
   * or the contract's current one when an amendment keeps it, to use
   * instead of creating another.
   */
  existingPricing?: string;
  /** For a fee to create: the list fee it's the customer's own amount for. */
  basedOn?: string;
  /** Percent off the fee, if any. */
  discount?: number;
  /** How often a recurring fee is charged: its pricing's interval. */
  interval?: FeeInterval;
  /** When a recurring fee is invoiced, set on the Offer's reference. */
  billingTiming?: FeeBillingTiming;
  /** How many periods a recurring fee runs for, on the Offer's reference; unset for no end. */
  periods?: number;
};

export type CreateContractOfferInput = {
  orgName: string;
  accountName: string;
  /** Names the Offer, e.g. "Acme Corp contract". */
  displayName: string;
  /**
   * The contract's fees, each its own pricing and invoice line: its own,
   * then those from the price list. Leave out one-time fees when amending
   * a started contract: they'd be charged again.
   */
  fees: ContractFeeInput[];
  /** Usage billed alongside the fees, if any, and customer pricings to create for it. */
  usage: UsagePlan;
};

const isNotFound = (err: unknown) => {
  const e = err as { status?: number; response?: { status?: number } } | null;
  return e?.status === 404 || e?.response?.status === 404;
};

/** Deletes what a failed contract save created, Offer first, and returns what's left. */
const removeContractResources = async (created: { offer?: string; pricings: string[] }) => {
  const left: string[] = [];
  const remove = async (name: string, del: () => Promise<unknown>) => {
    try {
      await del();
    } catch (err) {
      if (!isNotFound(err)) left.push(name);
    }
  };
  if (created.offer) {
    const offer = created.offer;
    await remove(offer, () => deleteBillingMiloapisComV1Alpha1Offer({ path: { name: offer } }));
  }
  for (const name of created.pricings) {
    await remove(name, () =>
      deleteBillingMiloapisComV1Alpha1NamespacedServicePricing({
        path: { namespace: DEFAULT_SERVICE_PRICING_NAMESPACE, name },
      })
    );
  }
  return left;
};

/**
 * Creates a contract's fee pricings and a published Offer with them, then,
 * once an entitlement can point at the Offer, `assign`s it to the account.
 *
 * If any step fails, the pricings and Offer it created are deleted again,
 * so nothing is left unused and a retry starts afresh (their names are
 * timestamped, so a retry would otherwise make another set). The error says
 * what couldn't be deleted, if anything.
 */
export const createContractOffer = async <T>(
  input: CreateContractOfferInput,
  assign: (offerName: string) => Promise<T>,
  now = new Date()
): Promise<T> => {
  const names = contractResourceNames(input.accountName, now);
  const labels = contractLabels(input);
  const created: { offer?: string; pricings: string[] } = { pricings: [] };
  try {
    const plan = await createContractPricings(input, names, labels, created);
    await createOffer({ name: names.offer, displayName: input.displayName, labels, ...plan });
    created.offer = names.offer;
    await publishOffer(names.offer);
    await waitForOfferSnapshot(names.offer, plan.servicePricingRefs.length);
    return await assign(names.offer);
  } catch (err) {
    throw await contractSaveError(err, created);
  }
};

const contractLabels = ({ orgName, accountName }: { orgName: string; accountName: string }) => ({
  [CONTRACT_BILLING_ACCOUNT_LABEL]: accountName,
  [CONTRACT_ORGANIZATION_LABEL]: orgName,
});

/**
 * Creates the pricings a contract's fees and usage need, those it doesn't
 * reuse, recording each in `created`, and returns its Offer's plan.
 */
const createContractPricings = async (
  input: CreateContractOfferInput,
  names: ReturnType<typeof contractResourceNames>,
  labels: Record<string, string>,
  created: { pricings: string[] }
) => {
  const fees = input.fees.map((fee, index) => ({
    ...fee,
    name: fee.existingPricing || names.fee(index),
  }));
  for (const fee of fees) {
    if (fee.existingPricing) continue;
    await createFixedServicePricing({
      name: fee.name,
      displayName: fee.label,
      chargeType: fee.chargeType,
      amount: fee.amount,
      serviceRef: fee.serviceRef,
      pricingUnit: fee.pricingUnit,
      interval: fee.chargeType === 'Recurring' ? fee.interval : undefined,
      basedOn: fee.basedOn,
      labels,
    });
    created.pricings.push(fee.name);
  }
  const usageRefs = input.usage.refs.map((ref) => ({ ...ref }));
  for (const [i, pricing] of input.usage.create.entries()) {
    const name = names.usage(i);
    await createCustomerUsagePricing({ name, spec: pricing.spec, labels });
    created.pricings.push(name);
    usageRefs[pricing.index] = { ...usageRefs[pricing.index], name };
  }
  return contractOfferPlan({ namespace: DEFAULT_SERVICE_PRICING_NAMESPACE, fees, usageRefs });
};

/** Removes what a failed save created, and says so in the error. */
const contractSaveError = async (
  err: unknown,
  created: { offer?: string; pricings: string[] },
  outcome = "The contract wasn't saved"
) => {
  const message = err instanceof Error ? err.message : String(err);
  const left = await removeContractResources(created);
  return new Error(
    left.length > 0
      ? `${message}. ${outcome}, and these couldn't be deleted again: ${left.join(', ')}.`
      : `${message}. ${outcome}.`,
    { cause: err }
  );
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

/** The entitlement made for an account that has none when it's put on a contract. */
export const contractEntitlementName = (accountName: string) => `${accountName}-contract`;

/**
 * Puts an account that has no entitlement on a contract: creates its
 * entitlement for the Offer, starting at midnight UTC on startsAt.
 *
 * Billing allows one entitlement per account, so if another appeared since
 * the page loaded (staff on another tab, or the default offer being seeded),
 * creating this one fails. Then the contract goes on that one instead, as
 * long as it isn't on a contract already.
 */
export const createBillingEntitlementWithContract = async (
  orgName: string,
  accountName: string,
  offerName: string,
  startsAt: string
): Promise<BillingEntitlement | undefined> => {
  const namespace = buildOrganizationNamespace(orgName);
  try {
    const response = await createBillingMiloapisComV1Alpha1NamespacedBillingEntitlement({
      baseURL: getClientOrgControlPlaneBaseURL(orgName),
      path: { namespace },
      query: { fieldManager: FIELD_MANAGER },
      body: {
        apiVersion: 'billing.miloapis.com/v1alpha1',
        kind: 'BillingEntitlement',
        metadata: { name: contractEntitlementName(accountName), namespace },
        spec: {
          billingAccountRef: { name: accountName },
          offerRef: { name: offerName },
          contract: { startsAt },
        },
      },
    });
    return response.data?.data;
  } catch (err) {
    // 409 when the name is taken; 422 when billing's webhook finds another
    // entitlement for the account. Anything else, or a 422 for another
    // reason, leaves the account without one, so the error stands.
    const status = isAxiosError(err) ? err.response?.status : undefined;
    if (status !== 409 && status !== 422) throw err;
    const existing = await billingEntitlementForAccountQuery(orgName, accountName);
    const existingName = existing?.metadata?.name;
    if (!existingName) throw err;
    if (existing.spec?.contract) {
      throw new Error(
        `The account was put on a contract meanwhile, by entitlement ${existingName}. Reload to see it.`,
        { cause: err }
      );
    }
    return setBillingEntitlementContract(orgName, existingName, offerName, startsAt);
  }
};

export type SetUpContractInput = {
  orgName: string;
  accountName: string;
  /** The account's entitlement. Without one, the contract creates it. */
  entitlementName?: string;
  /** Midnight UTC, RFC 3339. */
  startsAt: string;
  offer: CreateContractOfferInput;
  /** The draft the contract was edited from, discarded once it's set up. */
  draftName?: string;
};

/**
 * Puts an account on a contract: creates its fees and Offer, then sets the
 * contract on the account's entitlement, or creates the entitlement with it.
 */
export const setUpContract = async ({
  orgName,
  accountName,
  entitlementName,
  startsAt,
  offer,
  draftName,
}: SetUpContractInput) => {
  const result = await createContractOffer(offer, (offerName) =>
    entitlementName
      ? setBillingEntitlementContract(orgName, entitlementName, offerName, startsAt)
      : createBillingEntitlementWithContract(orgName, accountName, offerName, startsAt)
  );
  if (draftName) await discardPublishedDraft(orgName, accountName, draftName);
  return result;
};

export type ChangeContractFeesInput = {
  orgName: string;
  accountName: string;
  entitlementName: string;
  offer: CreateContractOfferInput;
  /** The draft the fees were edited from, discarded once they're changed. */
  draftName?: string;
};

/**
 * Changes a contract's fees: a new Offer for the entitlement. Once the
 * contract has started, it applies from the next billing date.
 */
export const changeContractFees = async ({
  orgName,
  accountName,
  entitlementName,
  offer,
  draftName,
}: ChangeContractFeesInput) => {
  const result = await createContractOffer(offer, (offerName) =>
    switchBillingEntitlementOffer(orgName, entitlementName, offerName)
  );
  if (draftName) await discardPublishedDraft(orgName, accountName, draftName);
  return result;
};

// ─── Draft contracts ─────────────────────────────────────────────────────────
//
// A draft contract is its Offer at launchStage Draft, with the contract labels
// and, for a new contract, its start date annotated. It's on no entitlement,
// so nothing bills from it. An account has at most one: saving updates it.

const contractSelector = (orgName: string, accountName: string) =>
  `${CONTRACT_BILLING_ACCOUNT_LABEL}=${accountName},${CONTRACT_ORGANIZATION_LABEL}=${orgName}`;

/** The account's contract Offers, published or not. */
const contractOffersForAccount = async (orgName: string, accountName: string) => {
  const response = await listBillingMiloapisComV1Alpha1Offer({
    query: { labelSelector: contractSelector(orgName, accountName), limit: 500 },
  });
  return filterNotDeleting(response.data?.data?.items ?? []);
};

/** The account's draft contract, or null when it has none. */
export const contractDraftQuery = async (
  orgName: string,
  accountName: string
): Promise<Offer | null> => {
  const drafts = (await contractOffersForAccount(orgName, accountName)).filter(isContractDraft);
  // Saving updates the one draft, so there's only ever one, but if two were
  // saved at once the newest wins.
  drafts.sort((a, b) =>
    (b.metadata?.creationTimestamp ?? '').localeCompare(a.metadata?.creationTimestamp ?? '')
  );
  return drafts[0] ?? null;
};

const refNames = (offer: Offer) => (offer.spec?.servicePricingRefs ?? []).map((ref) => ref.name);

export type SaveContractDraftInput = {
  offer: CreateContractOfferInput;
  /** A new contract's start date, if picked: midnight UTC, RFC 3339. */
  startsAt?: string;
};

/**
 * Saves the account's draft contract: creates the pricings its fees need,
 * then creates the draft Offer, or updates the one the account has. Nothing
 * is billed until it's published.
 *
 * Pricings the draft no longer uses are left in place: staff can create
 * pricings but not delete them, and a failed delete would show staff an
 * error after the save succeeded. They're labelled with the account, and
 * bill nothing without an Offer.
 */
export const saveContractDraft = async (
  { offer: input, startsAt }: SaveContractDraftInput,
  now = new Date()
): Promise<Offer | undefined> => {
  const { orgName, accountName } = input;
  const names = contractResourceNames(accountName, now);
  const labels = contractLabels(input);
  const created: { pricings: string[] } = { pricings: [] };
  let previous: Offer | null = null;
  let saved: Offer | undefined;
  try {
    previous = await contractDraftQuery(orgName, accountName);
    const plan = await createContractPricings(input, names, labels, created);
    const previousName = previous?.metadata?.name;
    saved = previousName
      ? await patchOffer({
          name: previousName,
          body: {
            metadata: {
              annotations: {
                'kubernetes.io/display-name': input.displayName.trim(),
                [CONTRACT_STARTS_AT_ANNOTATION]: startsAt ?? null,
              },
            },
            spec: plan,
          },
        })
      : await createOffer({
          name: names.offer,
          displayName: input.displayName,
          labels,
          annotations: startsAt ? { [CONTRACT_STARTS_AT_ANNOTATION]: startsAt } : undefined,
          ...plan,
        });
  } catch (err) {
    throw await contractSaveError(err, created, "The draft wasn't saved");
  }
  return saved;
};

/**
 * Deletes a draft Offer. Its fee pricings stay, as on saving a draft (see
 * saveContractDraft).
 */
export const discardContractDraft = async (
  orgName: string,
  accountName: string,
  draftName: string
) => {
  // Fresh, so only the account's current draft is deleted.
  const draft = await contractDraftQuery(orgName, accountName);
  if (draft?.metadata?.name !== draftName) return;
  try {
    await deleteBillingMiloapisComV1Alpha1Offer({ path: { name: draftName } });
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
};

/**
 * Once a contract is published from a draft, the draft goes. It's already
 * billing, so failing to delete the draft doesn't fail the publish: staff
 * can still discard it.
 */
const discardPublishedDraft = async (orgName: string, accountName: string, draftName: string) => {
  try {
    await discardContractDraft(orgName, accountName, draftName);
  } catch {
    // Shown on the account page, to discard by hand.
  }
};

/**
 * Publishes the account's draft contract as it is. For an account without a
 * contract, the draft's start date sets one up, on the entitlement or a new
 * one; for an account on one, the draft changes its fees.
 *
 * GA Offers can't change and Draft ones can't be assigned, so the draft is
 * published as a copy: a new GA Offer with the draft's pricings. Only once
 * the copy is on the account does the draft go, so if publishing fails, the
 * draft is still there to fix and try again.
 */
export const publishContractDraft = async (
  orgName: string,
  accountName: string,
  draftName: string,
  now = new Date()
) => {
  const [draft, entitlement] = await Promise.all([
    contractDraftQuery(orgName, accountName),
    billingEntitlementForAccountQuery(orgName, accountName),
  ]);
  if (!draft || draft.metadata?.name !== draftName) {
    throw new Error('The draft changed or was discarded meanwhile. Reload to see it.');
  }
  const assign = draftAssignment(orgName, accountName, draft, entitlement, now);
  const names = contractResourceNames(accountName, now);
  const created: { offer?: string; pricings: string[] } = { pricings: [] };
  const refs = draft.spec?.servicePricingRefs ?? [];
  let result: Awaited<ReturnType<typeof assign>>;
  try {
    await createOffer({
      name: names.offer,
      displayName: draft.metadata?.annotations?.['kubernetes.io/display-name'],
      labels: contractLabels({ orgName, accountName }),
      chargeTypes: draft.spec?.chargeTypes ?? [],
      servicePricingRefs: refs,
      ...(draft.spec?.discount ? { discount: draft.spec.discount } : {}),
    });
    created.offer = names.offer;
    await publishOffer(names.offer);
    await waitForOfferSnapshot(names.offer, refs.length);
    result = await assign(names.offer);
  } catch (err) {
    // The pricings are the draft's, so only the copy goes.
    throw await contractSaveError(err, created, "The draft wasn't published");
  }
  await discardPublishedDraft(orgName, accountName, draftName);
  return result;
};

/** What each publish problem asks staff to do. */
const DRAFT_PUBLISH_PROBLEMS: Record<DraftPublishProblem, string> = {
  'no-start': 'The draft has no start date. Edit it to pick one.',
  'start-passed': "The draft's start date has passed. Edit it to pick another.",
  'start-too-far': "The draft's start date is too far ahead. Edit it to pick another.",
  'contract-exists':
    "The account was put on a contract after this draft was saved, so the draft can't set one up. Edit it to change the contract's fees instead.",
  'one-time-after-start':
    'The contract has started since this draft was saved, so its one-time fees would be charged again. Edit the draft to remove them.',
};

/**
 * How a draft goes on the account: a new contract from its start date, or
 * new fees for the contract the account is on. Throws when the account has
 * changed since the draft was saved in a way that needs it edited first.
 */
const draftAssignment = (
  orgName: string,
  accountName: string,
  draft: Offer,
  entitlement: BillingEntitlement | null,
  now: Date
) => {
  const problem = draftPublishProblem(draft, entitlement, now);
  if (problem) throw new Error(DRAFT_PUBLISH_PROBLEMS[problem]);
  const entitlementName = entitlement?.metadata?.name;
  if (getContractState(entitlement, now) && entitlementName) {
    return (offerName: string) =>
      switchBillingEntitlementOffer(orgName, entitlementName, offerName);
  }
  // No problem means a valid start date.
  const startsAt = draft.metadata?.annotations?.[CONTRACT_STARTS_AT_ANNOTATION] ?? '';
  return (offerName: string) =>
    entitlementName
      ? setBillingEntitlementContract(orgName, entitlementName, offerName, startsAt)
      : createBillingEntitlementWithContract(orgName, accountName, offerName, startsAt);
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
