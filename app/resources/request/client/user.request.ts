import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  ListQueryParams,
  UserApprove,
  UserApproveSchema,
  UserDeactivate,
  UserDeactivateSchema,
  UserDeactivationListResponseSchema,
  UserInvite,
  UserInviteSchema,
  UserListResponseSchema,
  UserReject,
  UserRejectSchema,
  UserResponseSchema,
  UserUpdate,
  UserUpdateSchema,
} from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const userListQuery = (params?: ListQueryParams) => {
  const fieldSelectors: Record<string, string> = {};

  if (params?.search) {
    fieldSelectors['spec.email'] = params.search;
  }

  if (params?.filters?.registrationApproval) {
    fieldSelectors['status.registrationApproval'] = params.filters.registrationApproval;
  }

  const fieldSelectorString =
    Object.keys(fieldSelectors).length > 0
      ? Object.entries(fieldSelectors)
          .map(([key, value]) => `${key}=${value}`)
          .join(',')
      : undefined;

  return apiRequestClient({
    method: 'GET',
    url: '/apis/iam.miloapis.com/v1alpha1/users',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(fieldSelectorString && { fieldSelector: fieldSelectorString }),
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

export const userInviteMutation = (payload: UserInvite) => {
  return apiRequestClient({
    method: 'POST',
    url: '/apis/iam.miloapis.com/v1alpha1/platforminvitations',
    data: payload,
  })
    .input(UserInviteSchema)
    .execute();
};

export const userApproveMutation = (payload: UserApprove) => {
  return apiRequestClient({
    method: 'POST',
    url: '/apis/iam.miloapis.com/v1alpha1/platformaccessapprovals',
    data: payload,
  })
    .input(UserApproveSchema)
    .execute();
};

export const userRejectMutation = (payload: UserReject) => {
  return apiRequestClient({
    method: 'POST',
    url: '/apis/iam.miloapis.com/v1alpha1/platformaccessrejections',
    data: payload,
  })
    .input(UserRejectSchema)
    .execute();
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
    queryFn: async () => {
      const response = await apiRequestClient({
        method: 'GET',
        url: `/apis/iam.miloapis.com/v1alpha1/userdeactivations`,
        params: {
          limit: 1,
          fieldSelector: `spec.userRef.name=${userId}`,
        },
      })
        .output(UserDeactivationListResponseSchema)
        .execute();

      const data = response?.data?.items?.[0] ?? null;
      return { ...response, data };
    },
    enabled: !!userId && state === 'Inactive',
  });
};

export const useUserListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: ['users', 'list', params],
    queryFn: () => userListQuery(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!params?.search,
  });
};
