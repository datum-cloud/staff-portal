import { groupListQuery, groupMembershipListQuery } from '../apis/group.api';
import { groupMembershipCreateMutation, groupMembershipDeleteMutation } from '../apis/group.api';
import { GroupMembershipFilters, ListQueryParams } from '@/resources/schemas';
import { ComMiloapisIamV1Alpha1GroupMembership } from '@openapi/iam.miloapis.com/v1alpha1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const groupQueryKeys = {
  all: ['groups'] as const,
  list: (params?: ListQueryParams) => ['groups', 'list', params] as const,
  members: {
    all: (groupName: string) => ['groups', groupName, 'members'] as const,
    list: (groupName: string, params?: ListQueryParams<GroupMembershipFilters>) =>
      ['groups', groupName, 'members', 'list', params] as const,
  },
};

export const useGroupListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: groupQueryKeys.list(params),
    queryFn: () => groupListQuery(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useGroupMembershipListQuery = (
  groupName: string,
  params?: ListQueryParams<GroupMembershipFilters>
) => {
  return useQuery({
    queryKey: groupQueryKeys.members.list(groupName, params),
    queryFn: () =>
      groupMembershipListQuery({
        limit: params?.limit,
        cursor: params?.cursor,
        filters: { fieldSelector: `spec.groupRef.name=${groupName}` },
      }),
    enabled: Boolean(groupName),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateGroupMembershipMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      namespace = 'milo-system',
      payload,
    }: {
      namespace?: string;
      payload: ComMiloapisIamV1Alpha1GroupMembership['spec'];
    }) => groupMembershipCreateMutation(namespace, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupQueryKeys.all });
    },
  });
};

export const useDeleteGroupMembershipMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (metadata: ComMiloapisIamV1Alpha1GroupMembership['metadata']) =>
      groupMembershipDeleteMutation(metadata),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupQueryKeys.all });
    },
  });
};
