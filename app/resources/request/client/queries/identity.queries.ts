import { identityListQuery, sessionListQuery } from '../apis/identity.api';
import { sessionDeleteMutation } from '../apis/identity.api';
import { ListQueryParams } from '@/resources/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const identityQueryKeys = {
  all: ['identity'] as const,
  list: (userId: string, params?: ListQueryParams) => ['identity', 'list', userId, params] as const,
};

export const sessionQueryKeys = {
  all: ['sessions'] as const,
  list: (userId: string, params?: ListQueryParams) => ['sessions', 'list', userId, params] as const,
};

export const useSessionListQuery = (userId: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: sessionQueryKeys.list(userId, params),
    queryFn: () => sessionListQuery(userId, params),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useIdentityListQuery = (userId: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: identityQueryKeys.list(userId, params),
    queryFn: () => identityListQuery(userId, params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useDeleteSessionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, sessionName }: { userId: string; sessionName: string }) =>
      sessionDeleteMutation(userId, sessionName),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.all,
      });
      await queryClient.invalidateQueries({
        queryKey: sessionQueryKeys.list(variables.userId),
      });
    },
  });
};
