import {
  groupCreateMutation,
  groupDeleteMutation,
  groupListQuery,
  groupMembershipCreateMutation,
  groupMembershipDeleteMutation,
  groupMembershipsForGroupQuery,
  groupUpdateMutation,
  type GroupDetailsInput,
} from '../apis/group.api';
import { userSummariesQuery } from '../apis/search.api';
import { ListQueryParams } from '@/resources/schemas';
import {
  ComMiloapisIamV1Alpha1Group,
  ComMiloapisIamV1Alpha1GroupMembership,
} from '@openapi/iam.miloapis.com/v1alpha1';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const groupQueryKeys = {
  all: ['groups'] as const,
  list: (params?: ListQueryParams) => ['groups', 'list', params] as const,
  members: (namespace: string, groupName: string) =>
    ['groups', namespace, groupName, 'members'] as const,
  /** Users looked up by name, for showing members' names and emails. */
  userSummaries: (names: readonly string[]) => ['groups', 'user-summaries', names] as const,
};

type GroupList = Awaited<ReturnType<typeof groupListQuery>>;
type GroupMembershipList = Awaited<ReturnType<typeof groupMembershipsForGroupQuery>>;

/**
 * Groups and memberships both carry an IAM finalizer, so after a delete the
 * API keeps returning them, marked with a deletionTimestamp, until the
 * controller finishes. For staff they're already gone: leave them out. Module
 * level so TanStack keeps the selected result stable between renders.
 */
const withoutDeleting = <T extends { items: { metadata?: { deletionTimestamp?: string } }[] }>(
  list: T | undefined
): T | undefined =>
  list && { ...list, items: list.items.filter((item) => !item.metadata?.deletionTimestamp) };

export const useGroupListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: groupQueryKeys.list(params),
    queryFn: () => groupListQuery(params),
    select: withoutDeleting<NonNullable<GroupList>>,
    staleTime: 5 * 60 * 1000,
  });
};

/** One group's members: only memberships in the group's own namespace. */
export const useGroupMembershipListQuery = (namespace: string, groupName: string) => {
  return useQuery({
    queryKey: groupQueryKeys.members(namespace, groupName),
    queryFn: () => groupMembershipsForGroupQuery(namespace, groupName),
    select: withoutDeleting<NonNullable<GroupMembershipList>>,
    enabled: Boolean(namespace && groupName),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Names and emails for exactly these users, however many users exist (the
 * old lookup loaded the first 500 users and missed the rest; #849).
 */
export const useGroupMemberUsersQuery = (userNames: readonly string[]) => {
  const names = [...new Set(userNames)].sort();
  return useQuery({
    queryKey: groupQueryKeys.userSummaries(names),
    queryFn: () => userSummariesQuery(names),
    enabled: names.length > 0,
    // When a member is added or removed the names change; keep showing the
    // names we have while the new lookup runs, instead of blanking every row.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, details }: { name: string; details: GroupDetailsInput }) =>
      groupCreateMutation(name, details),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupQueryKeys.all });
    },
  });
};

export const useUpdateGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      metadata,
      details,
    }: {
      metadata: ComMiloapisIamV1Alpha1Group['metadata'];
      details: GroupDetailsInput;
    }) => groupUpdateMutation(metadata, details),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupQueryKeys.all });
    },
  });
};

/**
 * Deletes a group. Like memberships, the API keeps listing it (marked as
 * deleting) until its finalizer runs, so drop it from every cached group list
 * straight away; the list's `select` keeps it out after the refetch too.
 */
export const useDeleteGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (metadata: ComMiloapisIamV1Alpha1Group['metadata']) =>
      groupDeleteMutation(metadata),
    onSuccess: async (_, metadata) => {
      queryClient.setQueriesData<GroupList>({ queryKey: ['groups', 'list'] }, (list) =>
        list
          ? {
              ...list,
              items: list.items.filter(
                (item) =>
                  !(
                    item.metadata?.name === metadata?.name &&
                    item.metadata?.namespace === metadata?.namespace
                  )
              ),
            }
          : list
      );
      await queryClient.invalidateQueries({ queryKey: groupQueryKeys.all });
    },
  });
};

export const useCreateGroupMembershipMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      namespace,
      payload,
    }: {
      namespace: string;
      payload: ComMiloapisIamV1Alpha1GroupMembership['spec'];
    }) => groupMembershipCreateMutation(namespace, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupQueryKeys.all });
    },
  });
};

/**
 * Deletes a membership. The API keeps it (marked as deleting) until the IAM
 * controller's finalizer runs, so a refetch right away still returns it; drop
 * it from the group's cached list straight away instead of waiting.
 */
export const useDeleteGroupMembershipMutation = (namespace: string, groupName: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (metadata: ComMiloapisIamV1Alpha1GroupMembership['metadata']) =>
      groupMembershipDeleteMutation(metadata),
    onSuccess: async (_, metadata) => {
      queryClient.setQueryData<GroupMembershipList>(
        groupQueryKeys.members(namespace, groupName),
        (list) =>
          list && {
            ...list,
            items: list.items.filter((item) => item.metadata?.name !== metadata?.name),
          }
      );
      await queryClient.invalidateQueries({ queryKey: groupQueryKeys.all });
    },
  });
};
