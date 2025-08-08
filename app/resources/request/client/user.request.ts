import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  ListQueryParams,
  UserDeactivate,
  UserDeactivateSchema,
  UserDeactivationResponseSchema,
  UserListResponseSchema,
} from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

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

export const userDeactivateMutation = (payload: UserDeactivate) => {
  return apiRequestClient({
    method: 'POST',
    url: '/apis/iam.miloapis.com/v1alpha1/userdeactivations',
    data: payload,
  })
    .input(UserDeactivateSchema)
    .execute();
};

export const userReactivateMutation = (userId: string) => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/iam.miloapis.com/v1alpha1/userdeactivations/${userId}`,
  }).execute();
};

export const useUserDeactivationQuery = (userId: string, state?: string) => {
  return useQuery({
    queryKey: ['user', 'deactivation', userId],
    queryFn: () =>
      apiRequestClient({
        method: 'GET',
        url: `/apis/iam.miloapis.com/v1alpha1/userdeactivations/${userId}`,
      })
        .output(UserDeactivationResponseSchema)
        .execute(),
    enabled: !!userId && state === 'Inactive',
  });
};
