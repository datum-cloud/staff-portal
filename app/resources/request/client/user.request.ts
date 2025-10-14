import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  ListQueryParams,
  UserDeactivate,
  UserDeactivateSchema,
  UserDeactivationResponseSchema,
  UserListResponseSchema,
  UserResponseSchema,
  UserUpdate,
  UserUpdateSchema,
} from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const userListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/iam.miloapis.com/v1alpha1/users',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(params?.search && { fieldSelector: `metadata.name=${params.search}` }),
    },
  })
    .output(UserListResponseSchema)
    .execute();
};

export const userUpdateMutation = (userId: string, payload: UserUpdate) => {
  return apiRequestClient({
    method: 'PATCH',
    url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
    params: {
      fieldManager: 'datum-staff-portal',
    },
    headers: {
      'Content-Type': 'application/merge-patch+json',
    },
    data: payload,
  })
    .input(UserUpdateSchema)
    .output(UserResponseSchema)
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

export const useUserListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: ['users', 'list', params],
    queryFn: () => userListQuery(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
