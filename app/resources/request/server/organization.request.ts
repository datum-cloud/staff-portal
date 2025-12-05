import { readResourcemanagerMiloapisComV1Alpha1Organization } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

export const orgDetailQuery = async (token: string, orgName: string) => {
  const response = await readResourcemanagerMiloapisComV1Alpha1Organization({
    path: {
      name: orgName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as unknown as UnwrapProxyResponse<typeof response.data>;
};
