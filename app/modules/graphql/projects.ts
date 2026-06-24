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

export async function getProject(name: string): Promise<GqlProject | null> {
  const client = createGqlClient({ type: 'global' });
  const result = await client.query(PROJECT_QUERY, { name }).toPromise();
  if (result.error) throw mapApiError(result.error);
  return result.data?.project ?? null;
}
