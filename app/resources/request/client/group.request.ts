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
      limit: params?.limit,
      continue: params?.cursor,
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

export const groupMembershipListQuery = async (
  params?: ListQueryParams<GroupMembershipFilters>
) => {
  const response = await listIamMiloapisComV1Alpha1GroupMembershipForAllNamespaces({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      ...(params?.filters?.fieldSelector && { fieldSelector: params.filters.fieldSelector }),
    },
  });
  return response.data.data;
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
