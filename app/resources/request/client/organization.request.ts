import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  ListQueryParams,
  MemberInvitationCreate,
  MemberInvitationListResponse,
  MemberInvitationListResponseSchema,
  MemberInvitationResponseSchema,
  MemberListResponseSchema,
  OrganizationListResponseSchema,
  ProjectListResponseSchema,
  TeamMember,
} from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const orgListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/resourcemanager.miloapis.com/v1alpha1/organizations',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(params?.search && { fieldSelector: `metadata.name=${params.search}` }),
    },
  })
    .output(OrganizationListResponseSchema)
    .execute();
};

export const orgProjectListQuery = (orgName: string, params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}/control-plane/apis/resourcemanager.miloapis.com/v1alpha1/projects`,
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(ProjectListResponseSchema)
    .execute();
};

export const orgMemberListQuery = async (orgName: string, params?: ListQueryParams) => {
  const memberList = await apiRequestClient({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/namespaces/organization-${orgName}/organizationmemberships`,
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(MemberListResponseSchema)
    .execute();

  const invitationList = await apiRequestClient({
    method: 'GET',
    url: `/apis/iam.miloapis.com/v1alpha1/namespaces/organization-${orgName}/userinvitations`,
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(MemberInvitationListResponseSchema)
    .execute();

  const members: TeamMember[] = memberList.data.items.map((member) => ({
    givenName: member.status?.user?.givenName ?? '',
    familyName: member.status?.user?.familyName ?? '',
    email: member.status?.user?.email || '',
    roles: undefined,
    type: 'member' as const,
    name: member.spec.userRef.name,
    invitationState: undefined,
    createdAt: member.metadata.creationTimestamp,
  }));

  const invitations: TeamMember[] = invitationList.data.items.map((invitation) => ({
    givenName: invitation.spec.givenName ?? '',
    familyName: invitation.spec.familyName ?? '',
    email: invitation.spec.email,
    roles: invitation.spec.roles,
    type: 'invitation' as const,
    name: invitation.metadata.name,
    invitationState: invitation.spec.state,
    createdAt: invitation.metadata.creationTimestamp,
  }));

  return {
    code: 'API_REQUEST_SUCCESS',
    data: [...members, ...invitations],
    path: `/apis/resourcemanager.miloapis.com/v1alpha1/namespaces/organization-${orgName}/organizationmemberships`,
  };
};

export const orgInvitationCreateMutation = (orgName: string, payload: MemberInvitationCreate) => {
  return apiRequestClient({
    method: 'POST',
    url: `/apis/iam.miloapis.com/v1alpha1/namespaces/organization-${orgName}/userinvitations`,
    data: payload,
  })
    .output(MemberInvitationResponseSchema)
    .execute();
};

export const orgInvitationDeleteMutation = (orgName: string, name: string) => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/iam.miloapis.com/v1alpha1/namespaces/organization-${orgName}/userinvitations/${name}`,
  }).execute();
};

export const orgDeleteMutation = (orgName: string) => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}`,
  }).execute();
};

export const useOrgListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: ['organizations', 'list', params],
    queryFn: () => orgListQuery(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
