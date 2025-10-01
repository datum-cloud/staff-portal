import { apiRequest } from '@/modules/axios/axios.server';
import {
  IdentitySessionListResponseSchema,
  IdentitySessionResponseSchema,
} from '@/resources/schemas';

// Server-side list sessions for current user (impersonated via bearer)
export const sessionListQuery = (token: string, userId: string) => {
  return apiRequest({
    method: 'GET',
    url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane/apis/identity.miloapis.com/v1alpha1/sessions`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(IdentitySessionListResponseSchema)
    .execute();
};

// Server-side delete a session for current user
export const sessionDeleteMutation = (token: string, userId: string, sessionName: string) => {
  return apiRequest({
    method: 'DELETE',
    url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane/apis/identity.miloapis.com/v1alpha1/sessions/${sessionName}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(IdentitySessionResponseSchema)
    .execute();
};


