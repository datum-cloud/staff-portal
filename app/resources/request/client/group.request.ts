import { GroupMembershipFilters, ListQueryParams } from '@/resources/schemas';
import {
  ComMiloapisIamV1Alpha1GroupMembership,
  createIamMiloapisComV1Alpha1NamespacedGroupMembership,
  deleteIamMiloapisComV1Alpha1NamespacedGroupMembership,
  listIamMiloapisComV1Alpha1GroupForAllNamespaces,
  listIamMiloapisComV1Alpha1GroupMembershipForAllNamespaces,
} from '@openapi/iam.miloapis.com/v1alpha1';
import { useQuery } from '@tanstack/react-query';

export const groupListQuery = async (params?: ListQueryParams) => {
  const response = await listIamMiloapisComV1Alpha1GroupForAllNamespaces({
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  });
  return response.data.data;
};

export const useGroupListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: ['groups', 'list', params],
    queryFn: () => groupListQuery(params),
    staleTime: 5 * 60 * 1000,
  });
};

/** Same query shape as `userListQuery`: omit limit/continue for full list (client table). */
export const groupMembershipListQuery = async (
  params?: ListQueryParams<GroupMembershipFilters>
) => {
  const response = await listIamMiloapisComV1Alpha1GroupMembershipForAllNamespaces({
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(params?.filters?.fieldSelector && { fieldSelector: params.filters.fieldSelector }),
    },
  });
  return response.data.data;
};

/**
 * Members of a single group. Pass `params` only if you need server paging; otherwise
 * client table uses full `data.items` (no limit in params).
 */
export const useGroupMembershipListQuery = (
  groupName: string,
  params?: ListQueryParams<GroupMembershipFilters>
) => {
  return useQuery({
    queryKey: ['groups', groupName, 'members', 'list', params],
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

export const groupMembershipDeleteMutation = (
  metadata: ComMiloapisIamV1Alpha1GroupMembership['metadata']
) => {
  return deleteIamMiloapisComV1Alpha1NamespacedGroupMembership({
    path: { namespace: metadata?.namespace ?? '', name: metadata?.name ?? '' },
  });
};

export const groupMembershipCreateMutation = async (
  namespace: string = 'milo-system',
  payload: ComMiloapisIamV1Alpha1GroupMembership['spec']
) => {
  const response = await createIamMiloapisComV1Alpha1NamespacedGroupMembership({
    path: { namespace },
    body: {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'GroupMembership',
      metadata: { generateName: 'group-membership-', namespace },
      spec: payload,
    },
  });
  return response.data.data;
};
