import { createGqlClient } from './client';
import { generateQueryOp } from './generated';
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
  /** Set while the project is terminating. */
  deletionTimestamp: string | null;
  /** Unparsed ResourceCleanup condition message. */
  resourceCleanupMessage: string | null;
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

// gqlts selections (replace the old GraphQL query-string fragments).
const ORG_CORE_SELECTION = {
  name: true,
  displayName: true,
  type: true,
  createdAt: true,
  state: true,
  contactInfo: { businessName: true, name: true, email: true },
  onboardingComplete: true,
  onboardingReason: true,
  onboardingMessage: true,
} as const;

/**
 * Project fields shared by the `organizationProjects` and `projects` queries.
 * List queries omit nested org projects — that field fans out one control-plane
 * (plus billing enrichment) call per org and dominates list latency.
 */
export const PROJECT_SELECTION = {
  name: true,
  displayName: true,
  organizationName: true,
  organizationDisplayName: true,
  organizationBusinessName: true,
  hasActiveBillingAccount: true,
  billingAccountName: true,
  createdAt: true,
  state: true,
  deletionTimestamp: true,
  resourceCleanupMessage: true,
} as const;

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
  const op = generateQueryOp({
    __name: 'StaffOrganizations',
    organizations: [
      {
        limit: params?.limit ?? null,
        cursor: params?.cursor ?? null,
        search: params?.search ?? null,
      },
      { items: ORG_CORE_SELECTION, continueToken: true },
    ],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  const data = result.data?.organizations ?? { items: [], continueToken: null };
  return {
    items: (data.items ?? []).map((org: GqlOrganizationFields) => mapGqlOrganization(org)),
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
  const op = generateQueryOp({
    __name: 'StaffOrganization',
    organization: [
      { name },
      {
        ...ORG_CORE_SELECTION,
        projects: [{ limit: 100 }, { items: { name: true }, continueToken: true }],
      },
    ],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  const org = result.data?.organization;
  return org ? mapGqlOrganization(org as GqlOrganizationFields) : null;
}

export async function listOrgProjects(
  orgName: string,
  params?: { limit?: number; cursor?: string }
): Promise<GqlProjectList> {
  const client = createGqlClient({ type: 'global' });
  const op = generateQueryOp({
    __name: 'StaffOrgProjects',
    organizationProjects: [
      { orgName, limit: params?.limit ?? null, cursor: params?.cursor ?? null },
      { items: PROJECT_SELECTION, continueToken: true },
    ],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  return (result.data?.organizationProjects ?? {
    items: [],
    continueToken: null,
  }) as GqlProjectList;
}

export async function listOrgMembers(orgName: string): Promise<GqlOrgMember[]> {
  const client = createGqlClient({ type: 'global' });
  const op = generateQueryOp({
    __name: 'StaffOrgMembers',
    organizationMembers: [
      { orgName },
      {
        name: true,
        givenName: true,
        familyName: true,
        email: true,
        roles: true,
        type: true,
        invitationState: true,
        createdAt: true,
        userName: true,
        avatarUrl: true,
      },
    ],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  return (result.data?.organizationMembers ?? []) as GqlOrgMember[];
}
