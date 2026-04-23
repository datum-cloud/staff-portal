import {
  listIamMiloapisComV1Alpha1GroupMembershipForAllNamespaces,
  readIamMiloapisComV1Alpha1NamespacedGroup,
} from '@openapi/iam.miloapis.com/v1alpha1';
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

export const userGroupMembershipsQuery = async (token: string, userId: string) => {
  const response = await listIamMiloapisComV1Alpha1GroupMembershipForAllNamespaces({
    query: {
      fieldSelector: `spec.userRef.name=${userId}`,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = response.data as unknown as UnwrapProxyResponse<typeof response.data>;
  return data?.items ?? [];
};
