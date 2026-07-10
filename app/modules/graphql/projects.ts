import { createGqlClient } from './client';
import type { GqlProject, GqlProjectList } from './organizations';
import { mapApiError } from '@/utils/errors/error-mapper';

const PROJECTS_QUERY = `
  query Projects($limit: Int, $cursor: String, $search: String) {
    projects(limit: $limit, cursor: $cursor, search: $search) {
      items { name displayName organizationName createdAt state }
      continueToken
    }
  }
`;

const PROJECT_QUERY = `
  query Project($name: String!) {
    project(name: $name) {
      name displayName organizationName createdAt state
    }
  }
`;

export async function listProjects(params?: {
  limit?: number;
  cursor?: string;
  search?: string;
}): Promise<GqlProjectList> {
  const client = createGqlClient({ type: 'global' });
  const result = await client
    .query(PROJECTS_QUERY, {
      limit: params?.limit ?? null,
      cursor: params?.cursor ?? null,
      search: params?.search ?? null,
    })
    .toPromise();
  if (result.error) throw mapApiError(result.error);
  return result.data?.projects ?? { items: [], continueToken: null };
}

const ALL_PROJECTS_PAGE_LIMIT = 100;
// Safety net against a runaway walk (e.g. a continueToken loop bug) — mirrors
// the search index's SEARCH_MAX_PAGES pattern. 100 pages * 100/page = 10,000 rows.
const ALL_PROJECTS_MAX_PAGES = 100;

/**
 * Walks `continueToken` to fetch every project matching `search`, rather than
 * a single page. `listProjects`/`useProjectListQuery` intentionally stay
 * single-page (e.g. the project-picker typeahead in useProjectSearch wants a
 * capped, fast lookup) — this is for views that need a true total (the
 * Projects list table, growth charts) where a hidden page limit would
 * silently under-count.
 */
export async function listAllProjects(
  search: string = ''
): Promise<{ items: GqlProject[]; hasMore: boolean }> {
  const items: GqlProject[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < ALL_PROJECTS_MAX_PAGES; page++) {
    const result = await listProjects({ limit: ALL_PROJECTS_PAGE_LIMIT, cursor, search });
    items.push(...result.items);
    cursor = result.continueToken ?? undefined;
    if (!cursor) return { items, hasMore: false };
  }

  return { items, hasMore: Boolean(cursor) };
}

export async function getProject(name: string): Promise<GqlProject | null> {
  const client = createGqlClient({ type: 'global' });
  const result = await client.query(PROJECT_QUERY, { name }).toPromise();
  if (result.error) throw mapApiError(result.error);
  return result.data?.project ?? null;
}
