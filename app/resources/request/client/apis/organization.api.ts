import { PROXY_URL } from '@/modules/axios/axios.client';
import {
  organizationMembersOp,
  organizationOp,
  organizationProjectsOp,
  organizationsOp,
  type GqlOrganization,
} from '@/resources/gql/organization.gql';
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

// ─── GraphQL-backed (gateway) ────────────────────────────────────────────────
// Operations (field selections) live in `resources/gql/organization.gql.ts`;
// these functions run them and map the raw gateway shape into the UI domain
// types. The mapper input type below is the subset of selected fields these
// functions read — TypeScript checks it against the ops' inferred output, so it
// can't silently drift from the selection.

type GqlOrganizationFields = {
  name: string;
  displayName: string;
  type: string;
  createdAt?: string | null;
  state?: string | null;
  contactInfo?: {
    businessName?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  onboardingComplete?: boolean | null;
  onboardingReason?: string | null;
  onboardingMessage?: string | null;
  projects?: { items?: Array<{ name: string }> | null; continueToken?: string | null } | null;
};

/** Maps gateway Organization fields into the list-row shape used by the UI. */
export const mapGqlOrganization = (org: GqlOrganizationFields): GqlOrganization => {
  const businessName = org.contactInfo?.businessName?.trim() || null;
  const onboardingComplete = org.onboardingComplete === true;

  const projectItems = org.projects?.items ?? [];

  return {
    name: org.name,
    displayName: org.displayName,
    type: org.type,
    createdAt: org.createdAt ?? null,
    state: org.state ?? null,
    contactInfo: org.contactInfo
      ? {
          businessName,
          name: org.contactInfo.name ?? null,
          email: org.contactInfo.email ?? null,
        }
      : null,
    onboardingComplete,
    onboardingStatus: onboardingComplete ? 'Active' : 'Inactive',
    entityType: businessName ? 'Company' : 'Individual',
    onboardingReason: org.onboardingReason ?? null,
    onboardingMessage: org.onboardingMessage ?? null,
    projectCount: projectItems.length,
    hasMoreProjects: Boolean(org.projects?.continueToken),
  };
};

export const listOrganizations = async (params?: {
  limit?: number;
  cursor?: string;
  search?: string;
}) => {
  const data = await organizationsOp(params ?? {});
  const list = data?.organizations;
  return {
    items: (list?.items ?? []).map(mapGqlOrganization),
    continueToken: list?.continueToken ?? null,
  };
};

const ALL_ORGANIZATIONS_PAGE_LIMIT = 100;
// Safety net against a runaway walk — mirrors listAllProjects' pattern.
const ALL_ORGANIZATIONS_MAX_PAGES = 100;

/**
 * Walks `continueToken` to fetch every organization. Client-side search covers
 * name / displayName / type / company — the gateway `search` arg is name-only.
 */
export const listAllOrganizations = async (
  search: string = ''
): Promise<{ items: GqlOrganization[]; hasMore: boolean }> => {
  const items: GqlOrganization[] = [];
  let cursor: string | undefined;
  const searchLower = search.trim().toLowerCase();

  for (let page = 0; page < ALL_ORGANIZATIONS_MAX_PAGES; page++) {
    const result = await listOrganizations({
      limit: ALL_ORGANIZATIONS_PAGE_LIMIT,
      cursor,
    });
    if (searchLower) {
      items.push(
        ...result.items.filter(
          (org) =>
            org.name.toLowerCase().includes(searchLower) ||
            org.displayName.toLowerCase().includes(searchLower) ||
            org.type.toLowerCase().includes(searchLower) ||
            (org.contactInfo?.businessName?.toLowerCase().includes(searchLower) ?? false)
        )
      );
    } else {
      items.push(...result.items);
    }
    cursor = result.continueToken ?? undefined;
    if (!cursor) return { items, hasMore: false };
  }

  return { items, hasMore: Boolean(cursor) };
};

export const getOrganization = async (name: string): Promise<GqlOrganization | null> => {
  const data = await organizationOp(name);
  return data?.organization ? mapGqlOrganization(data.organization) : null;
};

export const listOrgProjects = async (
  orgName: string,
  params?: { limit?: number; cursor?: string }
) => {
  const data = await organizationProjectsOp(orgName, params);
  const list = data?.organizationProjects;
  return {
    items: list?.items ?? [],
    continueToken: list?.continueToken ?? null,
  };
};

export const listOrgMembers = async (orgName: string) => {
  const data = await organizationMembersOp(orgName);
  return data?.organizationMembers ?? [];
};
