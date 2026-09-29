import { createGqlClient } from './client';
import { generateQueryOp } from './generated';
import { PROJECT_SELECTION, type GqlProject, type GqlProjectList } from './organizations';
import { mapApiError } from '@/utils/errors/error-mapper';

export async function listProjects(params?: {
  limit?: number;
  cursor?: string;
  search?: string;
}): Promise<GqlProjectList> {
  const client = createGqlClient({ type: 'global' });
  const op = generateQueryOp({
    __name: 'StaffProjects',
    projects: [
      {
        limit: params?.limit ?? null,
        cursor: params?.cursor ?? null,
        search: params?.search ?? null,
      },
      { items: PROJECT_SELECTION, continueToken: true },
    ],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  return (result.data?.projects ?? { items: [], continueToken: null }) as GqlProjectList;
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
  const op = generateQueryOp({
    __name: 'StaffProject',
    project: [{ name }, PROJECT_SELECTION],
  });
  const result = await client.query(op.query, op.variables).toPromise();
  if (result.error) throw mapApiError(result.error);
  return (result.data?.project ?? null) as GqlProject | null;
}
