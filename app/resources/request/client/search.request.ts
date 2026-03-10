import { userGetQuery } from './user.request';
import { PROXY_URL } from '@/modules/axios/axios.client';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1Project,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import {
  createSearchMiloapisComV1Alpha1ResourceSearchQuery,
  NetMiloapisGoSearchPkgApisSearchV1Alpha1ResourceSearchQuery,
  NetMiloapisGoSearchPkgApisSearchV1Alpha1TargetResource,
} from '@openapi/search.miloapis.com/v1alpha1';

/**
 * Builds a ResourceSearchQuery CRD body for the given query string and target resources.
 */
function buildQuery(
  queryString: string,
  targetResources: NetMiloapisGoSearchPkgApisSearchV1Alpha1TargetResource[],
  kind: string
): NetMiloapisGoSearchPkgApisSearchV1Alpha1ResourceSearchQuery {
  return {
    apiVersion: 'search.miloapis.com/v1alpha1',
    kind: 'ResourceSearchQuery',
    metadata: {
      name: `query-${kind.toLowerCase()}-${Date.now()}`,
    },
    spec: {
      query: queryString,
      limit: 5,
      targetResources,
    },
  };
}

/**
 * Executes a search query and returns extracted, typed entity objects sorted by relevance score.
 */
async function executeSearch<T>(
  queryBody: NetMiloapisGoSearchPkgApisSearchV1Alpha1ResourceSearchQuery
): Promise<T[]> {
  const response = await createSearchMiloapisComV1Alpha1ResourceSearchQuery({
    baseURL: PROXY_URL,
    body: queryBody,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const results = response.data?.data?.status?.results ?? [];

  return (
    results
      .slice()
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
      // Cast is safe: each query is scoped to one kind via targetResources,
      // so the API only returns resources of type T.
      .map((result) => result.resource as T)
  );
}

/**
 * Searches for User resources, then enriches results with full user data from the IAM API.
 * The search index only stores a subset of fields; fetching the full resource ensures
 * givenName, familyName, email, etc. are always populated.
 */
export const searchUsersQuery = async (
  queryString: string
): Promise<ComMiloapisIamV1Alpha1User[]> => {
  const targetResources: NetMiloapisGoSearchPkgApisSearchV1Alpha1TargetResource[] = [
    { group: 'iam.miloapis.com', version: 'v1alpha1', kind: 'User' },
  ];
  const results = await executeSearch<ComMiloapisIamV1Alpha1User>(
    buildQuery(queryString, targetResources, 'User')
  );

  try {
    return await Promise.all(
      results.map(async (user) => {
        const name = user.metadata?.name;
        if (!name) return user;
        try {
          return (await userGetQuery(name)) ?? user;
        } catch {
          return user;
        }
      })
    );
  } catch {
    return results;
  }
};

/**
 * Searches for Organization resources.
 */
export const searchOrganizationsQuery = (
  queryString: string
): Promise<ComMiloapisResourcemanagerV1Alpha1Organization[]> => {
  const targetResources: NetMiloapisGoSearchPkgApisSearchV1Alpha1TargetResource[] = [
    { group: 'resourcemanager.miloapis.com', version: 'v1alpha1', kind: 'Organization' },
  ];
  return executeSearch<ComMiloapisResourcemanagerV1Alpha1Organization>(
    buildQuery(queryString, targetResources, 'Organization')
  );
};

/**
 * Searches for Project resources.
 */
export const searchProjectsQuery = (
  queryString: string
): Promise<ComMiloapisResourcemanagerV1Alpha1Project[]> => {
  const targetResources: NetMiloapisGoSearchPkgApisSearchV1Alpha1TargetResource[] = [
    { group: 'resourcemanager.miloapis.com', version: 'v1alpha1', kind: 'Project' },
  ];
  return executeSearch<ComMiloapisResourcemanagerV1Alpha1Project>(
    buildQuery(queryString, targetResources, 'Project')
  );
};
