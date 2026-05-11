import { PROXY_URL } from '@/modules/axios/axios.client';
import { ListQueryParams } from '@/resources/schemas';
import {
  deleteIdentityMiloapisComV1Alpha1Session,
  listIdentityMiloapisComV1Alpha1Session,
  listIdentityMiloapisComV1Alpha1UserIdentity,
} from '@openapi/identity.miloapis.com/v1alpha1';

// Cross-user lookups are gated server-side by a SAR against milo on
// `get iam.miloapis.com/users/<userId>`. When userId equals the caller's
// own UID the selector is a no-op (handler short-circuits to self).
const buildUserScopedFieldSelector = (userId: string, extra?: string): string => {
  const parts = [`status.userUID=${userId}`];
  if (extra) parts.push(extra);
  return parts.join(',');
};

export const sessionListQuery = async (userId: string, params?: ListQueryParams) => {
  const response = await listIdentityMiloapisComV1Alpha1Session({
    baseURL: `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`,
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      fieldSelector: buildUserScopedFieldSelector(
        userId,
        params?.search ? `metadata.name=${params.search}` : undefined
      ),
    },
  });
  return response.data.data;
};

export const sessionDeleteMutation = (userId: string, sessionName: string) => {
  return deleteIdentityMiloapisComV1Alpha1Session({
    baseURL: `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`,
    path: { name: sessionName },
  });
};

export const identityListQuery = async (userId: string, params?: ListQueryParams) => {
  return listIdentityMiloapisComV1Alpha1UserIdentity({
    baseURL: `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`,
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      fieldSelector: buildUserScopedFieldSelector(userId),
    },
  });
};
