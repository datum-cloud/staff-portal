import { createGqlClient } from './client';
import { mapApiError } from '@/utils/errors/error-mapper';

export interface GqlOrganization {
  name: string;
  displayName: string;
  type: string;
  createdAt: string | null;
  state: string | null;
}

export interface GqlOrganizationList {
  items: GqlOrganization[];
  continueToken: string | null;
}

export interface GqlProject {
  name: string;
  displayName: string;
  organizationName: string;
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
}

const ORGANIZATIONS_QUERY = `
  query Organizations($limit: Int, $cursor: String, $search: String) {
    organizations(limit: $limit, cursor: $cursor, search: $search) {
      items { name displayName type createdAt state }
      continueToken
    }
  }
`;

const ORGANIZATION_QUERY = `
  query Organization($name: String!) {
    organization(name: $name) {
      name displayName type createdAt state
    }
  }
`;

const ORG_PROJECTS_QUERY = `
  query OrgProjects($orgName: String!, $limit: Int, $cursor: String) {
    organizationProjects(orgName: $orgName, limit: $limit, cursor: $cursor) {
      items { name displayName organizationName createdAt state }
      continueToken
    }
  }
`;

const ORG_MEMBERS_QUERY = `
  query OrgMembers($orgName: String!) {
    organizationMembers(orgName: $orgName) {
      name givenName familyName email roles type invitationState createdAt userName
    }
  }
`;

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
  return result.data?.organizations ?? { items: [], continueToken: null };
}

const ALL_ORGANIZATIONS_PAGE_LIMIT = 100;
// Safety net against a runaway walk — mirrors listAllProjects' pattern.
const ALL_ORGANIZATIONS_MAX_PAGES = 100;

/**
 * Walks `continueToken` to fetch every organization matching `search`, rather
 * than a single page. `listOrganizations`/`useOrgListQuery` intentionally stay
 * single-page (the org-picker typeahead in useOrganizationSearch wants a
 * capped, fast lookup) — this is for views that need a true total (the
 * Organizations list table, growth charts) where a hidden page limit would
 * silently under-count.
 */
export async function listAllOrganizations(
  search: string = ''
): Promise<{ items: GqlOrganization[]; hasMore: boolean }> {
  const items: GqlOrganization[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < ALL_ORGANIZATIONS_MAX_PAGES; page++) {
    const result = await listOrganizations({ limit: ALL_ORGANIZATIONS_PAGE_LIMIT, cursor, search });
    items.push(...result.items);
    cursor = result.continueToken ?? undefined;
    if (!cursor) return { items, hasMore: false };
  }

  return { items, hasMore: Boolean(cursor) };
}

export async function getOrganization(name: string): Promise<GqlOrganization | null> {
  const client = createGqlClient({ type: 'global' });
  const result = await client.query(ORGANIZATION_QUERY, { name }).toPromise();
  if (result.error) throw mapApiError(result.error);
  return result.data?.organization ?? null;
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
