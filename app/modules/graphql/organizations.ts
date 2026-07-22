import { createGqlClient } from './client';
import { mapApiError } from '@/utils/errors/error-mapper';

export interface GqlOrgContactInfo {
  businessName: string | null;
  name: string | null;
  email: string | null;
}

export interface GqlOrganization {
  name: string;
  displayName: string;
  type: string;
  createdAt: string | null;
  state: string | null;
  /** Company / legal name from org contact details. */
  contactInfo: GqlOrgContactInfo | null;
  /** True when status.conditions OnboardingComplete is True. */
  onboardingComplete: boolean;
  /** Derived list/filter label: Active when onboarded, else Inactive. */
  onboardingStatus: 'Active' | 'Inactive';
  /**
   * Company when `contactInfo.businessName` is set, otherwise Individual.
   * Used by the Type sidebar filter (not the legacy Personal/Standard field).
   */
  entityType: 'Company' | 'Individual';
  onboardingReason: string | null;
  onboardingMessage: string | null;
  /** Projects on the first page (limit 100). Only populated on detail queries. */
  projectCount: number;
  hasMoreProjects: boolean;
}

export interface GqlOrganizationList {
  items: GqlOrganization[];
  continueToken: string | null;
}

export interface GqlProject {
  name: string;
  displayName: string;
  organizationName: string;
  /** Owning org display name from the gateway; falls back to organizationName. */
  organizationDisplayName: string;
  /** Owning org company / legal name; null when unset. */
  organizationBusinessName: string | null;
  /** True when bound to a billing account that has a default payment method. */
  hasActiveBillingAccount: boolean;
  /** Bound billing account name when hasActiveBillingAccount is true. */
  billingAccountName: string | null;
  createdAt: string | null;
  state: string | null;
}

export interface GqlProjectList {
  items: GqlProject[];
  continueToken: string | null;
}

export interface GqlOrgMember {
  name: string;
  givenName: string | null;
  familyName: string | null;
  email: string;
  roles: string[];
  type: 'member' | 'invitation';
  invitationState: string | null;
  createdAt: string | null;
  /** The member's user resource name. Null for invitations, which have no user yet. */
  userName: string | null;
  /** Avatar URL from membership user status. Null for invitations. */
  avatarUrl: string | null;
}

type GqlOrganizationFields = {
  name: string;
  displayName: string;
  type: string;
  createdAt: string | null;
  state: string | null;
  contactInfo: GqlOrgContactInfo | null;
  onboardingComplete: boolean;
  onboardingReason: string | null;
  onboardingMessage: string | null;
  projects?: { items?: Array<{ name: string }> | null; continueToken?: string | null } | null;
};

const ORG_CORE_FIELDS = `
  name displayName type createdAt state
  contactInfo { businessName name email }
  onboardingComplete onboardingReason onboardingMessage
`;

/** List queries omit nested projects — that field fans out one control-plane
 *  (plus billing enrichment) call per org and dominates list latency. */
const ORG_LIST_FIELDS = ORG_CORE_FIELDS;

const ORG_DETAIL_FIELDS = `
  ${ORG_CORE_FIELDS}
  projects(limit: 100) { items { name } continueToken }
`;

const ORGANIZATIONS_QUERY = `
  query Organizations($limit: Int, $cursor: String, $search: String) {
    organizations(limit: $limit, cursor: $cursor, search: $search) {
      items { ${ORG_LIST_FIELDS} }
      continueToken
    }
  }
`;

const ORGANIZATION_QUERY = `
  query Organization($name: String!) {
    organization(name: $name) {
      ${ORG_DETAIL_FIELDS}
    }
  }
`;

const ORG_PROJECTS_QUERY = `
  query OrgProjects($orgName: String!, $limit: Int, $cursor: String) {
    organizationProjects(orgName: $orgName, limit: $limit, cursor: $cursor) {
      items { name displayName organizationName organizationDisplayName organizationBusinessName hasActiveBillingAccount billingAccountName createdAt state }
      continueToken
    }
  }
`;

const ORG_MEMBERS_QUERY = `
  query OrgMembers($orgName: String!) {
    organizationMembers(orgName: $orgName) {
      name givenName familyName email roles type invitationState createdAt userName avatarUrl
    }
  }
`;

/** Maps gateway Organization fields into the list-row shape used by the UI. */
export function mapGqlOrganization(org: GqlOrganizationFields): GqlOrganization {
  const businessName = org.contactInfo?.businessName?.trim() || null;
  const onboardingComplete = org.onboardingComplete === true;

  const projectItems = org.projects?.items ?? [];

  return {
    name: org.name,
    displayName: org.displayName,
    type: org.type,
    createdAt: org.createdAt,
    state: org.state,
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
}

export async function listOrganizations(params?: {
  limit?: number;
  cursor?: string;
  search?: string;
}): Promise<GqlOrganizationList> {
  const client = createGqlClient({ type: 'global' });
  const result = await client
    .query(ORGANIZATIONS_QUERY, {
      limit: params?.limit ?? null,
      cursor: params?.cursor ?? null,
      search: params?.search ?? null,
    })
    .toPromise();
  if (result.error) throw mapApiError(result.error);
  const data = result.data?.organizations ?? { items: [], continueToken: null };
  return {
    items: (data.items ?? []).map(mapGqlOrganization),
    continueToken: data.continueToken ?? null,
  };
}

const ALL_ORGANIZATIONS_PAGE_LIMIT = 100;
// Safety net against a runaway walk — mirrors listAllProjects' pattern.
const ALL_ORGANIZATIONS_MAX_PAGES = 100;

/**
 * Walks `continueToken` to fetch every organization. Client-side search covers
 * name / displayName / type / company — the gateway `search` arg is name-only.
 */
export async function listAllOrganizations(
  search: string = ''
): Promise<{ items: GqlOrganization[]; hasMore: boolean }> {
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
}

export async function getOrganization(name: string): Promise<GqlOrganization | null> {
  const client = createGqlClient({ type: 'global' });
  const result = await client.query(ORGANIZATION_QUERY, { name }).toPromise();
  if (result.error) throw mapApiError(result.error);
  const org = result.data?.organization;
  return org ? mapGqlOrganization(org) : null;
}

export async function listOrgProjects(
  orgName: string,
  params?: { limit?: number; cursor?: string }
): Promise<GqlProjectList> {
  const client = createGqlClient({ type: 'global' });
  const result = await client
    .query(ORG_PROJECTS_QUERY, {
      orgName,
      limit: params?.limit ?? null,
      cursor: params?.cursor ?? null,
    })
    .toPromise();
  if (result.error) throw mapApiError(result.error);
  return result.data?.organizationProjects ?? { items: [], continueToken: null };
}

export async function listOrgMembers(orgName: string): Promise<GqlOrgMember[]> {
  const client = createGqlClient({ type: 'global' });
  const result = await client.query(ORG_MEMBERS_QUERY, { orgName }).toPromise();
  if (result.error) throw mapApiError(result.error);
  return result.data?.organizationMembers ?? [];
}
