import { buildOrganizationNamespace } from '@/features/billing/utils';
import { PROXY_URL } from '@/modules/axios/axios.client';
import { ListQueryParams } from '@/resources/schemas';
import {
  listBillingMiloapisComV1Alpha1BillingAccountBindingForAllNamespaces,
  listBillingMiloapisComV1Alpha1BillingAccountForAllNamespaces,
  listBillingMiloapisComV1Alpha1NamespacedBillingAccount,
  listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding,
  listBillingMiloapisComV1Alpha1NamespacedPaymentMethod,
  listBillingMiloapisComV1Alpha1PaymentMethodForAllNamespaces,
  readBillingMiloapisComV1Alpha1NamespacedBillingAccount,
} from '@openapi/billing.miloapis.com/v1alpha1';

const getClientOrgControlPlaneBaseURL = (orgName: string) =>
  `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}/control-plane`;

const filterNotDeleting = <T extends { metadata?: { deletionTimestamp?: string } }>(items: T[]) =>
  items.filter((item) => !item.metadata?.deletionTimestamp);

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
