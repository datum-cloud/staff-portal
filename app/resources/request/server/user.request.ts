import { readIamMiloapisComV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

export const userDetailQuery = async (token: string, userId: string) => {
  const response = await readIamMiloapisComV1Alpha1User({
    path: {
      name: userId,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as UnwrapProxyResponse<typeof response.data>;
};
