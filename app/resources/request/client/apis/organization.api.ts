import { PROXY_URL } from '@/modules/axios/axios.client';
import { ListQueryParams, TeamMember } from '@/resources/schemas';
import {
  ComMiloapisIamV1Alpha1UserInvitation,
  createIamMiloapisComV1Alpha1NamespacedUserInvitation,
  deleteIamMiloapisComV1Alpha1NamespacedUserInvitation,
  listIamMiloapisComV1Alpha1NamespacedUserInvitation,
} from '@openapi/iam.miloapis.com/v1alpha1';
import {
  deleteResourcemanagerMiloapisComV1Alpha1Organization,
  listResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership,
  listResourcemanagerMiloapisComV1Alpha1Organization,
  listResourcemanagerMiloapisComV1Alpha1Project,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';

export const orgListQuery = async (params?: ListQueryParams) => {
  const response = await listResourcemanagerMiloapisComV1Alpha1Organization({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      ...(params?.search && { fieldSelector: `metadata.name=${params.search}` }),
    },
  });
  return response.data.data;
};

export const orgProjectListQuery = async (orgName: string, params?: ListQueryParams) => {
  const response = await listResourcemanagerMiloapisComV1Alpha1Project({
    baseURL: `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}/control-plane`,
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  return response.data.data;
};

export const orgMemberListQuery = async (orgName: string, params?: ListQueryParams) => {
  const memberResponse =
    await listResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership({
      path: {
        namespace: `organization-${orgName}`,
      },
      query: {
        limit: params?.limit,
        continue: params?.cursor,
      },
    });
  const memberList = memberResponse.data.data;

  const invitationResponse = await listIamMiloapisComV1Alpha1NamespacedUserInvitation({
    path: {
      namespace: `organization-${orgName}`,
    },
    query: {
      limit: params?.limit,
      continue: params?.cursor,
    },
  });
  const invitationList = invitationResponse.data.data;

  const members: TeamMember[] = memberList.items.map((member) => ({
    givenName: member.status?.user?.givenName ?? '',
    familyName: member.status?.user?.familyName ?? '',
    email: member.status?.user?.email || '',
    roles: member.spec?.roles ?? [],
    type: 'member' as const,
    name: member.spec?.userRef?.name ?? '',
    invitationState: undefined,
    createdAt: member.metadata?.creationTimestamp ?? '',
  }));

  const invitations: TeamMember[] = invitationList.items.map((invitation) => ({
    givenName: invitation.spec?.givenName ?? '',
    familyName: invitation.spec?.familyName ?? '',
    email: invitation.spec?.email ?? '',
    roles: invitation.spec?.roles ?? [],
    type: 'invitation' as const,
    name: invitation.metadata?.name ?? '',
    invitationState: invitation.spec?.state ?? undefined,
    createdAt: invitation.metadata?.creationTimestamp ?? '',
  }));

  return [...members, ...invitations];
};

export const orgInvitationCreateMutation = async (
  orgName: string,
  payload: ComMiloapisIamV1Alpha1UserInvitation['spec']
) => {
  const response = await createIamMiloapisComV1Alpha1NamespacedUserInvitation({
    path: {
      namespace: `organization-${orgName}`,
    },
    body: {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'UserInvitation',
      metadata: {
        generateName: 'user-invitation-',
      },
      spec: payload,
    },
  });

  return response.data.data;
};

export const orgInvitationDeleteMutation = async (orgName: string, name: string) => {
  return deleteIamMiloapisComV1Alpha1NamespacedUserInvitation({
    path: {
      namespace: `organization-${orgName}`,
      name,
    },
  });
};

export const orgDeleteMutation = (orgName: string) => {
  return deleteResourcemanagerMiloapisComV1Alpha1Organization({
    path: {
      name: orgName,
    },
  });
};
