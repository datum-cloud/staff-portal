import { buildOrganizationNamespace } from '@/features/billing/utils';
import { env } from '@/utils/config/env.server';
import {
  listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding,
  listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement,
  listBillingMiloapisComV1Alpha1NamespacedInvoice,
  listBillingMiloapisComV1Alpha1NamespacedPaymentMethod,
  readBillingMiloapisComV1Alpha1NamespacedBillingAccount,
  type ComMiloapisBillingV1Alpha1BillingEntitlement,
} from '@openapi/billing.miloapis.com/v1alpha1';
import { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

const filterNotDeleting = <T extends { metadata?: { deletionTimestamp?: string } }>(items: T[]) =>
  items.filter((item) => !item.metadata?.deletionTimestamp);

const getOrgControlPlaneBaseURL = (orgName: string) =>
  `${env.API_URL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}/control-plane`;

export const billingAccountDetailRequest = async (
  token: string,
  orgName: string,
  accountName: string
) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await readBillingMiloapisComV1Alpha1NamespacedBillingAccount({
    baseURL: getOrgControlPlaneBaseURL(orgName),
    path: { namespace, name: accountName },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as unknown as UnwrapProxyResponse<typeof response.data>;
};

export const billingAccountBindingsForOrgRequest = async (token: string, orgName: string) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding({
    baseURL: getOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = response.data as unknown as UnwrapProxyResponse<typeof response.data>;
  return filterNotDeleting(data?.items ?? []);
};

export const paymentMethodsForOrgRequest = async (token: string, orgName: string) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedPaymentMethod({
    baseURL: getOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = response.data as unknown as UnwrapProxyResponse<typeof response.data>;
  return filterNotDeleting(data?.items ?? []);
};

export const invoicesForOrgRequest = async (token: string, orgName: string) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedInvoice({
    baseURL: getOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = response.data as unknown as UnwrapProxyResponse<typeof response.data>;
  return filterNotDeleting(data?.items ?? []);
};

export const billingEntitlementsForOrgRequest = async (token: string, orgName: string) => {
  const namespace = buildOrganizationNamespace(orgName);
  const response = await listBillingMiloapisComV1Alpha1NamespacedBillingEntitlement({
    baseURL: getOrgControlPlaneBaseURL(orgName),
    path: { namespace },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = response.data as unknown as UnwrapProxyResponse<typeof response.data>;
  return filterNotDeleting(data?.items ?? []) as ComMiloapisBillingV1Alpha1BillingEntitlement[];
};
