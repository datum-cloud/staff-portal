import { readServicesMiloapisComV1Alpha1Service } from '@openapi/services.miloapis.com/v1alpha1';
import { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

export const serviceDetailQuery = async (token: string, name: string) => {
  const response = await readServicesMiloapisComV1Alpha1Service({
    path: { name },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as UnwrapProxyResponse<typeof response.data>;
};
