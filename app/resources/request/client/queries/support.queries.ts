import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ComMiloApisSupportV1Alpha1SupportTicket,
  ComMiloApisSupportV1Alpha1UserReference,
} from '@openapi/support.miloapis.com/v1alpha1';
import {
  messageCreateMutation,
  messagePatchMutation,
  messageListQuery,
  ticketDetailQuery,
  ticketListQuery,
  ticketMarkReadMutation,
  ticketPatchMutation,
  ticketUpdateLastActivityMutation,
  kbEntryListQuery,
  kbEntryCreateMutation,
  kbEntryDeleteMutation,
  type TicketListParams,
  type KnowledgeBaseListParams,
} from '../apis/support.api';
import type { ComMiloApisSupportV1Alpha1KnowledgeBaseEntrySpec } from '@openapi/support.miloapis.com/v1alpha1';

export const supportQueryKeys = {
  all: ['support'] as const,
  tickets: {
    list: (params?: TicketListParams) => ['support', 'tickets', 'list', params] as const,
    detail: (name: string) => ['support', 'tickets', name] as const,
  },
  messages: {
    list: (ticketName: string) => ['support', 'messages', ticketName] as const,
  },
  kb: {
    list: (params?: KnowledgeBaseListParams) => ['support', 'kb', 'list', params] as const,
  },
};

export function useTicketListQuery(params?: TicketListParams, refetchInterval?: number) {
  return useQuery({
    queryKey: supportQueryKeys.tickets.list(params),
    queryFn: () => ticketListQuery(params),
    refetchInterval,
  });
}

export function useTicketDetailQuery(name: string) {
  return useQuery({
    queryKey: supportQueryKeys.tickets.detail(name),
    queryFn: () => ticketDetailQuery(name),
    enabled: !!name,
  });
}

export function useMessageListQuery(ticketName: string) {
  return useQuery({
    queryKey: supportQueryKeys.messages.list(ticketName),
    queryFn: () => messageListQuery(ticketName),
    enabled: !!ticketName,
  });
}

export function usePatchTicketMutation(ticketName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ComMiloApisSupportV1Alpha1SupportTicket['spec']>) =>
      ticketPatchMutation(ticketName, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportQueryKeys.tickets.detail(ticketName) });
      qc.invalidateQueries({ queryKey: supportQueryKeys.tickets.list() });
    },
  });
}

export function useMarkTicketReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketName, principalId }: { ticketName: string; principalId: string }) =>
      ticketMarkReadMutation(ticketName, principalId),
    onSuccess: (_, { ticketName }) => {
      qc.invalidateQueries({ queryKey: supportQueryKeys.tickets.list() });
      qc.invalidateQueries({ queryKey: supportQueryKeys.tickets.detail(ticketName) });
    },
  });
}

export function useUpdateTicketLastActivityMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticketName: string) => ticketUpdateLastActivityMutation(ticketName),
    onSuccess: (_, ticketName) => {
      qc.invalidateQueries({ queryKey: supportQueryKeys.tickets.list() });
      qc.invalidateQueries({ queryKey: supportQueryKeys.tickets.detail(ticketName) });
    },
  });
}

export function useCreateMessageMutation(ticketName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      authorRef,
      internal,
    }: {
      body: string;
      authorRef: ComMiloApisSupportV1Alpha1UserReference;
      internal?: boolean;
    }) => messageCreateMutation(ticketName, body, authorRef, internal ?? false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportQueryKeys.messages.list(ticketName) });
      qc.invalidateQueries({ queryKey: supportQueryKeys.tickets.detail(ticketName) });
    },
  });
}

export function useUpdateMessageMutation(ticketName: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body: string }) =>
      messagePatchMutation(name, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportQueryKeys.messages.list(ticketName) });
    },
  });
}

export function useKbEntryListQuery(params?: KnowledgeBaseListParams) {
  return useQuery({
    queryKey: supportQueryKeys.kb.list(params),
    queryFn: () => kbEntryListQuery(params),
  });
}

export function useCreateKbEntryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (spec: ComMiloApisSupportV1Alpha1KnowledgeBaseEntrySpec) =>
      kbEntryCreateMutation({
        metadata: { generateName: 'kb-' },
        spec,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportQueryKeys.kb.list() });
    },
  });
}

export function useDeleteKbEntryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => kbEntryDeleteMutation(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportQueryKeys.kb.list() });
    },
  });
}
