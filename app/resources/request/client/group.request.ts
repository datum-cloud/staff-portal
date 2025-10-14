import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  GroupListResponseSchema,
  GroupMembershipCreate,
  GroupMembershipCreateSchema,
  GroupMembershipFilters,
  GroupMembershipListResponseSchema,
  GroupMembershipResponseSchema,
  ListQueryParams,
} from '@/resources/schemas';

export const groupListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/iam.miloapis.com/v1alpha1/groups',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(GroupListResponseSchema)
    .execute();
};

export const groupMembershipListQuery = (params?: ListQueryParams<GroupMembershipFilters>) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/iam.miloapis.com/v1alpha1/groupmemberships',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(params?.filters?.fieldSelector && { fieldSelector: params.filters.fieldSelector }),
    },
  })
    .output(GroupMembershipListResponseSchema)
    .execute();
};

export const groupMembershipDeleteMutation = (name: string, namespace: string = 'milo-system') => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/iam.miloapis.com/v1alpha1/namespaces/${namespace}/groupmemberships/${name}`,
  }).execute();
};

export const groupMembershipCreateMutation = (
  payload: GroupMembershipCreate,
  namespace: string = 'milo-system'
) => {
  return apiRequestClient({
    method: 'POST',
    url: `/apis/iam.miloapis.com/v1alpha1/namespaces/${namespace}/groupmemberships`,
    data: payload,
  })
    .input(GroupMembershipCreateSchema)
    .output(GroupMembershipResponseSchema)
    .execute();
};
