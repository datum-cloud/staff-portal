import { createGqlClient } from './client';
import { mapApiError } from '@/utils/errors/error-mapper';
import type { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';

/**
 * A users-list row: the existing k8s `User` shape the table already reads
 * (metadata/spec/status), plus the fraud fields the gateway joins in. Keeping
 * the nested shape means the current columns/actions stay unchanged — only the
 * fraud column is new.
 */
export type GqlUser = ComMiloapisIamV1Alpha1User & {
  fraudScore: string | null;
  fraudDecision: string | null;
  fraudEvaluatedAt: string | null;
};

export interface GqlUserList {
  items: GqlUser[];
  continueToken: string | null;
}

/** Flat fields as returned by the gateway `users` query. */
type GqlUserFields = {
  name: string;
  email: string | null;
  givenName: string | null;
  familyName: string | null;
  createdAt: string | null;
  avatarUrl: string | null;
  lastLoginProvider: string | null;
  platformAccess: string | null;
  fraudScore: string | null;
  fraudDecision: string | null;
  fraudEvaluatedAt: string | null;
};

const USER_LIST_FIELDS = `
  name email givenName familyName createdAt avatarUrl lastLoginProvider platformAccess
  fraudScore fraudDecision fraudEvaluatedAt
`;

const USERS_QUERY = `
  query Users($limit: Int, $cursor: String, $search: String, $platformAccess: String) {
    users(limit: $limit, cursor: $cursor, search: $search, platformAccess: $platformAccess) {
      items { ${USER_LIST_FIELDS} }
      continueToken
    }
  }
`;

/**
 * Maps the gateway's flat User fields back into the k8s `User` row shape the
 * users table already consumes, plus the joined fraud fields.
 */
export function mapGqlUser(u: GqlUserFields): GqlUser {
  return {
    apiVersion: 'iam.miloapis.com/v1alpha1',
    kind: 'User',
    metadata: {
      name: u.name,
      creationTimestamp: u.createdAt ?? undefined,
    },
    spec: {
      email: u.email ?? undefined,
      givenName: u.givenName ?? undefined,
      familyName: u.familyName ?? undefined,
    },
    status: {
      platformAccess: u.platformAccess ?? undefined,
      avatarUrl: u.avatarUrl ?? undefined,
      lastLoginProvider: u.lastLoginProvider ?? undefined,
    },
    fraudScore: u.fraudScore,
    fraudDecision: u.fraudDecision,
    fraudEvaluatedAt: u.fraudEvaluatedAt,
  } as GqlUser;
}

export async function listUsers(params?: {
  limit?: number;
  cursor?: string;
  search?: string;
  platformAccess?: string;
}): Promise<GqlUserList> {
  const client = createGqlClient({ type: 'global' });
  const result = await client
    .query(USERS_QUERY, {
      limit: params?.limit ?? null,
      cursor: params?.cursor ?? null,
      search: params?.search ?? null,
      platformAccess: params?.platformAccess ?? null,
    })
    .toPromise();
  if (result.error) throw mapApiError(result.error);
  const data = result.data?.users ?? { items: [], continueToken: null };
  return {
    items: (data.items ?? []).map(mapGqlUser),
    continueToken: data.continueToken ?? null,
  };
}

const ALL_USERS_PAGE_LIMIT = 100;
// Safety net against a runaway walk — mirrors listAllOrganizations' pattern.
const ALL_USERS_MAX_PAGES = 100;

/**
 * Walks `continueToken` to fetch every user (with fraud score joined), for the
 * users list table and growth chart. Mirrors the REST `listAllUsers` it replaces.
 */
export async function listAllUsers(): Promise<{ items: GqlUser[]; hasMore: boolean }> {
  const items: GqlUser[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < ALL_USERS_MAX_PAGES; page++) {
    const result = await listUsers({ limit: ALL_USERS_PAGE_LIMIT, cursor });
    items.push(...result.items);
    cursor = result.continueToken ?? undefined;
    if (!cursor) return { items, hasMore: false };
  }

  return { items, hasMore: Boolean(cursor) };
}
