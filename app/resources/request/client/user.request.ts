import { apiRequestClient } from '@/modules/axios/axios.client';
import { ListQueryParams, UserListResponseSchema } from '@/resources/schemas';

export const userListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/iam.miloapis.com/v1alpha1/users',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(UserListResponseSchema)
    .execute();
};

export const userDeleteMutation = (userId: string) => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
  }).execute();
};
