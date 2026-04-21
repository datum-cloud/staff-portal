import { userOrgListQuery } from '../apis/membership.api';
import { userDeactivationQuery, userGetQuery, userListQuery } from '../apis/user.api';
import { ListQueryParams } from '@/resources/schemas';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const userQueryKeys = {
  all: ['users'] as const,
  list: (params?: ListQueryParams) => ['users', 'list', params] as const,
  detail: (userId: string) => ['users', 'detail', userId] as const,
  deactivation: (userId: string) => ['users', 'deactivation', userId] as const,
  organizations: {
    all: (userId: string) => ['users', userId, 'organizations'] as const,
    list: (userId: string) => ['users', userId, 'organizations', 'list'] as const,
  },
};

export const useUserDetailQuery = (userId: string) => {
  return useQuery({
    queryKey: userQueryKeys.detail(userId),
    queryFn: () => userGetQuery(userId),
    enabled: !!userId,
  });
};

export const useUserDeactivationQuery = (userId: string, state?: string) => {
  return useQuery({
    queryKey: userQueryKeys.deactivation(userId),
    queryFn: () => userDeactivationQuery(userId),
    enabled: !!userId && state === 'Inactive',
  });
};

export const useUserListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: userQueryKeys.list(params),
    queryFn: () => userListQuery(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserOrganizationListQuery = (userId: string) => {
  return useQuery({
    queryKey: userQueryKeys.organizations.list(userId),
    queryFn: () => userOrgListQuery(userId),
    enabled: !!userId,
  });
};

export const useInvalidateUserList = () => {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
  };
};
