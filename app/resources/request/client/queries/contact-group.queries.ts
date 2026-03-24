import { contactGroupListQuery } from '../apis/contact-group.api';
import {
  contactGroupDeleteMutation,
  contactGroupMembershipCreateMutation,
  contactGroupMembershipDeleteMutation,
} from '../apis/contact-group.api';
import { contactMembershipForGroupListQuery } from '../apis/contact-membership.api';
import { ListQueryParams } from '@/resources/schemas';
import type {
  ComMiloapisNotificationV1Alpha1ContactGroup,
  ComMiloapisNotificationV1Alpha1ContactGroupMembership,
} from '@openapi/notification.miloapis.com/v1alpha1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const contactGroupQueryKeys = {
  all: ['contact-groups'] as const,
  list: (params?: ListQueryParams) => ['contact-groups', 'list', params] as const,
  members: {
    all: (groupName: string) => ['contact-groups', groupName, 'members'] as const,
    list: (groupName: string) => ['contact-groups', groupName, 'members', 'list'] as const,
  },
};

export const useContactGroupListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: contactGroupQueryKeys.list(params),
    queryFn: () => contactGroupListQuery(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useContactGroupMemberListQuery = (groupName: string) => {
  return useQuery({
    queryKey: contactGroupQueryKeys.members.list(groupName),
    queryFn: () =>
      contactMembershipForGroupListQuery({
        filters: { fieldSelector: `spec.contactGroupRef.name=${groupName}` },
      }),
    enabled: !!groupName,
  });
};

export const useDeleteContactGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (metadata: ComMiloapisNotificationV1Alpha1ContactGroup['metadata']) =>
      contactGroupDeleteMutation(metadata),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contactGroupQueryKeys.all });
    },
  });
};

export const useCreateContactGroupMembershipMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      namespace = 'default',
      payload,
    }: {
      namespace?: string;
      payload: ComMiloapisNotificationV1Alpha1ContactGroupMembership['spec'];
    }) => contactGroupMembershipCreateMutation(namespace, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contactGroupQueryKeys.all });
    },
  });
};

export const useDeleteContactGroupMembershipMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (metadata: ComMiloapisNotificationV1Alpha1ContactGroupMembership['metadata']) =>
      contactGroupMembershipDeleteMutation(metadata),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contactGroupQueryKeys.all });
    },
  });
};
