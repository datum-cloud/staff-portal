import { userDeactivationQuery, userListQuery } from '../apis/user.api';
import { ListQueryParams } from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const userQueryKeys = {
  all: ['users'] as const,
  list: (params?: ListQueryParams) => ['users', 'list', params] as const,
  deactivation: (userId: string) => ['users', 'deactivation', userId] as const,
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
