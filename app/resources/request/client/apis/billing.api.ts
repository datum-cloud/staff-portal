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
import {
  createBillingMiloapisComV1Alpha1NamespacedBillingArrangement,
  createBillingMiloapisComV1Alpha1NamespacedBillingArrangementDecline,
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
  listBillingMiloapisComV1Alpha1NamespacedPaymentMethod,
  listBillingMiloapisComV1Alpha1NamespacedServicePricing,
  listBillingMiloapisComV1Alpha1Offer,
  listBillingMiloapisComV1Alpha1PaymentMethodForAllNamespaces,
  patchBillingMiloapisComV1Alpha1NamespacedBillingArrangement,
  patchBillingMiloapisComV1Alpha1NamespacedBillingEntitlement,
  patchBillingMiloapisComV1Alpha1Offer,
  readBillingMiloapisComV1Alpha1NamespacedBillingAccount,
  readBillingMiloapisComV1Alpha1NamespacedBillingArrangementApplication,
  readBillingMiloapisComV1Alpha1Offer,
  type ComMiloapisBillingV1Alpha1BillingEntitlement,
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
      },
      spec: {
        launchStage: 'Draft',
        chargeTypes: input.chargeTypes,
        servicePricingRefs: input.servicePricingRefs,
      },
    },
  });
  return response.data?.data;
};

export type PatchOfferInput = {
  name: string;
  body: {
    metadata?: { annotations?: Record<string, string> };
    spec?: Partial<OfferSpec>;
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
        servicePricingRefs: input.servicePricingRefs,
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
