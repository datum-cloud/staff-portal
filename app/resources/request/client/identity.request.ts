import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  IdentitySessionListResponseSchema,
  IdentitySessionResponseSchema,
} from '@/resources/schemas';

// List current user's sessions via virtual identity API
export const sessionListQuery = (userId: string) => {
  return apiRequestClient({
    method: 'GET',
    url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane/apis/identity.miloapis.com/v1alpha1/sessions`,
  })
    .output(IdentitySessionListResponseSchema)
    .execute();
};

// Delete a specific session by name/id
export const sessionDeleteMutation = (userId: string, sessionName: string) => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane/apis/identity.miloapis.com/v1alpha1/sessions/${sessionName}`,
  })
    .output(IdentitySessionResponseSchema)
    .execute();
};


