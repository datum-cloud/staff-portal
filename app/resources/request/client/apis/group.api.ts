import { GroupMembershipFilters, ListQueryParams } from '@/resources/schemas';
import {
  ComMiloapisIamV1Alpha1GroupMembership,
  createIamMiloapisComV1Alpha1NamespacedGroupMembership,
  deleteIamMiloapisComV1Alpha1NamespacedGroupMembership,
  listIamMiloapisComV1Alpha1GroupForAllNamespaces,
  listIamMiloapisComV1Alpha1GroupMembershipForAllNamespaces,
} from '@openapi/iam.miloapis.com/v1alpha1';

export const groupListQuery = async (params?: ListQueryParams) => {
  const response = await listIamMiloapisComV1Alpha1GroupForAllNamespaces({
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  });
  return response.data.data;
};

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
