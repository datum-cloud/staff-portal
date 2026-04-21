import { PROXY_URL } from '@/modules/axios/axios.client';
import { ListQueryParams } from '@/resources/schemas';
import {
  deleteIdentityMiloapisComV1Alpha1Session,
  listIdentityMiloapisComV1Alpha1Session,
  listIdentityMiloapisComV1Alpha1UserIdentity,
} from '@openapi/identity.miloapis.com/v1alpha1';

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
    },
  });
};
