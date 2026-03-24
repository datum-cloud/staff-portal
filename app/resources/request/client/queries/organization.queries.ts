import { orgListQuery, orgMemberListQuery, orgProjectListQuery } from '../apis/organization.api';
import { orgInvitationCreateMutation, orgInvitationDeleteMutation } from '../apis/organization.api';
import { ListQueryParams } from '@/resources/schemas';
import type { ComMiloapisIamV1Alpha1UserInvitation } from '@openapi/iam.miloapis.com/v1alpha1';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const organizationQueryKeys = {
  all: ['organizations'] as const,
  list: (params?: ListQueryParams) => ['organizations', 'list', params] as const,
  projects: {
    all: (orgName: string) => ['organizations', orgName, 'projects'] as const,
    list: (orgName: string, params?: ListQueryParams) =>
      ['organizations', orgName, 'projects', 'list', params] as const,
  },
  members: {
    all: (orgName: string) => ['organizations', orgName, 'members'] as const,
    list: (orgName: string, params?: ListQueryParams) =>
      ['organizations', orgName, 'members', 'list', params] as const,
  },
};

export const useOrgListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: organizationQueryKeys.list(params),
    queryFn: () => orgListQuery(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgProjectListQuery = (orgName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: organizationQueryKeys.projects.list(orgName, params),
    queryFn: () => orgProjectListQuery(orgName, params),
    enabled: !!orgName,
  });
};

export const useOrgMemberListQuery = (orgName: string, params?: ListQueryParams) => {
  return useQuery({
    queryKey: organizationQueryKeys.members.list(orgName, params),
    queryFn: () => orgMemberListQuery(orgName, params),
    enabled: !!orgName,
  });
};

export const useOrgInvitationCreateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgName,
      payload,
    }: {
      orgName: string;
      payload: ComMiloapisIamV1Alpha1UserInvitation['spec'];
    }) => orgInvitationCreateMutation(orgName, payload),
    onSuccess: async (_, variables) => {
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
