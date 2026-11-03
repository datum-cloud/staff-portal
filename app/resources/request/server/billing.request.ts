import { buildOrganizationNamespace } from '@/features/billing/utils';
import { env } from '@/utils/config/env.server';
import { readBillingMiloapisComV1Alpha1NamespacedBillingAccount } from '@openapi/billing.miloapis.com/v1alpha1';
import { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

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
