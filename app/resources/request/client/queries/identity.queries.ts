import {
  identityListQuery,
  passkeyListQuery,
  recoveryEmailListQuery,
  sessionListQuery,
} from '../apis/identity.api';
import { sessionDeleteMutation } from '../apis/identity.api';
import { listSessions, type ExtendedSession } from '@/modules/graphql/sessions';
import { ListQueryParams } from '@/resources/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const identityQueryKeys = {
  all: ['identity'] as const,
  list: (userId: string, params?: ListQueryParams) => ['identity', 'list', userId, params] as const,
  passkeys: (userId: string) => ['identity', 'passkeys', userId] as const,
  recoveryEmails: (userId: string) => ['identity', 'recoveryEmails', userId] as const,
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

/**
 * Sessions enriched with parsed user-agent and geolocation, served by
 * the graphql-gateway. Use this where you want browser/OS/city info;
 * use {@link useSessionListQuery} for the raw K8s shape (which still
 * carries `metadata.creationTimestamp`, `status.expiresAt`, etc.).
 */
export const useSessionListEnrichedQuery = (userId: string) => {
  return useQuery<ExtendedSession[]>({
    queryKey: ['sessions', 'enriched', userId] as const,
    queryFn: () => listSessions(userId),
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

/**
 * The user's enrolled passkeys, used for the count on the Account Identities card.
 * Served by zitadel-provider's virtual identity apiserver, so there is nothing to
 * cache aggressively — a minute is enough to survive a tab switch.
 */
export const usePasskeyListQuery = (userId: string) => {
  return useQuery({
    queryKey: identityQueryKeys.passkeys(userId),
    queryFn: () => passkeyListQuery(userId),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
};

/** The recovery links already sent to this user, read from the labelled audit Emails. */
export const useRecoveryEmailListQuery = (userId: string) => {
  return useQuery({
    queryKey: identityQueryKeys.recoveryEmails(userId),
    queryFn: () => recoveryEmailListQuery(userId),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
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
