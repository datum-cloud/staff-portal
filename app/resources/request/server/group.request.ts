import { readIamMiloapisComV1Alpha1NamespacedGroup } from '@openapi/iam.miloapis.com/v1alpha1';
import { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';

export const groupDetailQuery = async (
  token: string,
  groupName: string,
  namespace: string = 'milo-system'
) => {
  const response = await readIamMiloapisComV1Alpha1NamespacedGroup({
    path: {
      namespace,
      name: groupName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as UnwrapProxyResponse<typeof response.data>;
};
