import { groupListQuery, groupMembershipListQuery } from '../apis/group.api';
import { GroupMembershipFilters, ListQueryParams } from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

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
