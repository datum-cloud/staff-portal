import { PROXY_URL } from '@/modules/axios/axios.client';
import { ListQueryParams } from '@/resources/schemas';
import {
  deleteIdentityMiloapisComV1Alpha1Session,
  listIdentityMiloapisComV1Alpha1Session,
  listIdentityMiloapisComV1Alpha1UserIdentity,
} from '@openapi/identity.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';

// List current user's sessions via virtual identity API
export const sessionListQuery = async (userId: string, params?: ListQueryParams) => {
  const response = await listIdentityMiloapisComV1Alpha1Session({
    baseURL: `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`,
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(params?.search && { fieldSelector: `metadata.name=${params.search}` }),
    },
  });
  return response.data.data;
};

// Delete a specific session by name/id
export const sessionDeleteMutation = (userId: string, sessionName: string) => {
  return deleteIdentityMiloapisComV1Alpha1Session({
    baseURL: `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`,
    path: { name: sessionName },
  });
};

export const useIdentityListQuery = (userId: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: ['identity', 'list', userId, params],
    queryFn: () =>
      listIdentityMiloapisComV1Alpha1UserIdentity({
        baseURL: `${PROXY_URL}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`,
        query: {
          ...(params?.limit && { limit: params.limit }),
          ...(params?.cursor && { continue: params.cursor }),
        },
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
