import { recentChangesQuery, warningEventsQuery } from '../apis/activity.api';
import {
  getOrganization,
  listAllOrganizations,
  listOrganizations,
  listAllOrgProjects,
  listOrgMembers,
  listOrgProjects,
  orgInvitationDeleteMutation,
  orgInvitationResendMutation,
  organizationBusinessNamesQuery,
} from '../apis/organization.api';
import { retryOnceUnlessClientError } from '@/modules/tanstack/query';
import { ListQueryParams } from '@/resources/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const organizationQueryKeys = {
  all: ['organizations'] as const,
  list: (params?: ListQueryParams) => ['organizations', 'list', params] as const,
  listAll: (search?: string) =>
    ['organizations', 'list-all', 'v3-no-nested', search ?? ''] as const,
  detail: (orgName: string) => ['organizations', orgName, 'detail'] as const,
  warningEvents: (orgName: string) => ['organizations', orgName, 'warning-events'] as const,
  recentChanges: (orgName: string) => ['organizations', orgName, 'recent-changes'] as const,
  projects: {
    all: (orgName: string) => ['organizations', orgName, 'projects'] as const,
    list: (orgName: string, params?: ListQueryParams) =>
      ['organizations', orgName, 'projects', 'list', params] as const,
    listAll: (orgName: string) => ['organizations', orgName, 'projects', 'list-all'] as const,
  },
  members: {
    all: (orgName: string) => ['organizations', orgName, 'members'] as const,
    list: (orgName: string, params?: ListQueryParams) =>
      ['organizations', orgName, 'members', 'list', params] as const,
  },
  businessNames: (orgNames: string[]) =>
    ['organizations', 'business-names', [...orgNames].sort()] as const,
};

/** Resolves business names for a set of orgs (not cached on the membership status). */
export const useOrganizationBusinessNamesQuery = (orgNames: string[]) => {
  return useQuery({
    queryKey: organizationQueryKeys.businessNames(orgNames),
    queryFn: () => organizationBusinessNamesQuery(orgNames),
    enabled: orgNames.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

/** GraphQL-enriched org (company, onboarding, counts) for detail Overview / header. */
export const useOrganizationQuery = (orgName: string) => {
  return useQuery({
    queryKey: organizationQueryKeys.detail(orgName),
    queryFn: () => getOrganization(orgName),
    enabled: !!orgName,
    staleTime: 60 * 1000,
  });
};

export const useOrgListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: organizationQueryKeys.list(params),
    queryFn: () => listOrganizations(params),
    staleTime: 5 * 60 * 1000,
  });
};

/** Full organization list (walks continueToken) — for views needing a true total. */
export const useAllOrganizationsQuery = (search: string = '') => {
  return useQuery({
    queryKey: organizationQueryKeys.listAll(search),
    queryFn: () => listAllOrganizations(search),
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgProjectListQuery = (orgName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: organizationQueryKeys.projects.list(orgName, params),
    queryFn: () => listOrgProjects(orgName, params),
    enabled: !!orgName,
  });
};

/** Every project an organization owns, not just the first page. */
export const useOrgAllProjectsQuery = (orgName: string, options: { enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: organizationQueryKeys.projects.listAll(orgName),
    queryFn: () => listAllOrgProjects(orgName),
    enabled: (options.enabled ?? true) && !!orgName,
  });
};

/** The organization control plane's own Warning events from the last 24 hours (#769). */
export const useOrgWarningEventsQuery = (orgName: string) => {
  return useQuery({
    queryKey: organizationQueryKeys.warningEvents(orgName),
    queryFn: ({ signal }) => warningEventsQuery({ kind: 'organization', name: orgName }, signal),
    enabled: !!orgName,
    staleTime: 60 * 1000,
    retry: retryOnceUnlessClientError,
    refetchOnWindowFocus: false,
  });
};

/** The organization control plane's own newest changes from the last 24 hours (#770). */
export const useOrgRecentChangesQuery = (orgName: string) => {
  return useQuery({
    queryKey: organizationQueryKeys.recentChanges(orgName),
    queryFn: ({ signal }) => recentChangesQuery({ kind: 'organization', name: orgName }, signal),
    enabled: !!orgName,
    staleTime: 60 * 1000,
    retry: retryOnceUnlessClientError,
    refetchOnWindowFocus: false,
  });
};

export const useOrgMemberListQuery = (orgName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: organizationQueryKeys.members.list(orgName, params),
    queryFn: () => listOrgMembers(orgName),
    enabled: !!orgName,
  });
};

export const useOrgInvitationResendMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgName, name }: { orgName: string; name: string }) =>
      orgInvitationResendMutation(orgName, name),
    // Settled, not success: a failed create still deleted the old invitation.
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.members.all(variables.orgName),
      });
    },
  });
};

export const useOrgInvitationDeleteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgName, name }: { orgName: string; name: string }) =>
      orgInvitationDeleteMutation(orgName, name),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.members.all(variables.orgName),
      });
    },
  });
};
