import { PROXY_URL } from '@/modules/axios/axios.client';
import { createGqlClient } from '@/modules/graphql/client';
import { generateQueryOp } from '@/modules/graphql/generated';
import type { UserSummary } from '@/modules/graphql/generated/schema';
import { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import {
  ComDatumapisNetworkingV1AlphaDomain,
  ComDatumapisNetworkingV1AlphaHttpProxy,
} from '@openapi/networking.datumapis.com/v1alpha';
import { ComMiloapisNotificationV1Alpha1Contact } from '@openapi/notification.miloapis.com/v1alpha1';
import {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1Project,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import {
  createSearchMiloapisComV1Alpha1ResourceSearchQuery,
  NetMiloapisGoSearchPkgApisSearchV1Alpha1ResourceSearchQuery,
  NetMiloapisGoSearchPkgApisSearchV1Alpha1TargetResource,
} from '@openapi/search.miloapis.com/v1alpha1';

const ALL_TARGET_RESOURCES: NetMiloapisGoSearchPkgApisSearchV1Alpha1TargetResource[] = [
  // Entities
  { group: 'iam.miloapis.com', version: 'v1alpha1', kind: 'User' },
  { group: 'resourcemanager.miloapis.com', version: 'v1alpha1', kind: 'Organization' },
  { group: 'resourcemanager.miloapis.com', version: 'v1alpha1', kind: 'Project' },
  // Resources
  { group: 'networking.datumapis.com', version: 'v1alpha', kind: 'Domain' },
  { group: 'dns.networking.miloapis.com', version: 'v1alpha1', kind: 'DNSZone' },
  { group: 'notification.miloapis.com', version: 'v1alpha1', kind: 'Contact' },
  // Note disabled until ResourceIndexPolicy is deployed
  // { group: 'notes.miloapis.com', version: 'v1alpha1', kind: 'Note' },
];

/**
 * A single grouped search result, paired with the tenant info from the
 * upstream search index. `tenant.name` is the project name when
 * `tenant.type` is "project" (case-insensitive — the API spec says lowercase
 * but in practice "Project" has been observed). Use this to resolve project
 * scope for project-scoped resources (DNS zones, domains).
 */
export interface SearchResultItem<T> {
  resource: T;
  tenant?: { name?: string; type?: string };
}

export interface GroupedSearchResults {
  users: SearchResultItem<ComMiloapisIamV1Alpha1User>[];
  organizations: SearchResultItem<ComMiloapisResourcemanagerV1Alpha1Organization>[];
  projects: SearchResultItem<ComMiloapisResourcemanagerV1Alpha1Project>[];
  domains: SearchResultItem<ComDatumapisNetworkingV1AlphaDomain>[];
  dnsZones: SearchResultItem<ComMiloapisNetworkingDnsV1Alpha1DnsZone>[];
  contacts: SearchResultItem<ComMiloapisNotificationV1Alpha1Contact>[];
}

/**
 * Single search query that hits all resource types at once and groups the
 * results by kind client-side.
 */
export async function searchAllQuery(queryString: string): Promise<GroupedSearchResults> {
  const body: NetMiloapisGoSearchPkgApisSearchV1Alpha1ResourceSearchQuery = {
    apiVersion: 'search.miloapis.com/v1alpha1',
    kind: 'ResourceSearchQuery',
    metadata: {
      name: `query-all-${Date.now()}`,
    },
    spec: {
      query: queryString,
      limit: 25,
      targetResources: ALL_TARGET_RESOURCES,
    },
  };

  const response = await createSearchMiloapisComV1Alpha1ResourceSearchQuery({
    baseURL: PROXY_URL,
    body,
    headers: { 'Content-Type': 'application/json' },
  });

  const results = (response.data?.data?.status?.results ?? [])
    .slice()
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));

  const grouped: GroupedSearchResults = {
    users: [],
    organizations: [],
    projects: [],
    domains: [],
    dnsZones: [],
    contacts: [],
  };

  for (const result of results) {
    const resource = result.resource as any;
    const tenant = result.tenant;
    const apiVersion = (resource?.apiVersion as string) ?? '';
    const kind = ((resource?.kind as string) ?? '').toLowerCase();

    // Use apiVersion as primary discriminator, kind to disambiguate within same group
    if (apiVersion.startsWith('iam.miloapis.com/')) {
      grouped.users.push({ resource: resource as ComMiloapisIamV1Alpha1User, tenant });
    } else if (apiVersion.startsWith('resourcemanager.miloapis.com/')) {
      if (kind === 'organization') {
        grouped.organizations.push({
          resource: resource as ComMiloapisResourcemanagerV1Alpha1Organization,
          tenant,
        });
      } else {
        grouped.projects.push({
          resource: resource as ComMiloapisResourcemanagerV1Alpha1Project,
          tenant,
        });
      }
    } else if (apiVersion.startsWith('networking.datumapis.com/')) {
      grouped.domains.push({ resource: resource as ComDatumapisNetworkingV1AlphaDomain, tenant });
    } else if (apiVersion.startsWith('dns.networking.miloapis.com/')) {
      grouped.dnsZones.push({
        resource: resource as ComMiloapisNetworkingDnsV1Alpha1DnsZone,
        tenant,
      });
    } else if (apiVersion.startsWith('notification.miloapis.com/')) {
      grouped.contacts.push({
        resource: resource as ComMiloapisNotificationV1Alpha1Contact,
        tenant,
      });
    }
  }

  // Enrich users with full data where possible — tenant is preserved.
  try {
    const userNames = grouped.users
      .map((item) => item.resource.metadata?.name)
      .filter((name): name is string => !!name);

    if (userNames.length > 0) {
      const client = createGqlClient({ type: 'global' });
      const op = generateQueryOp({
        userSummaries: [
          { names: userNames },
          { name: true, email: true, givenName: true, familyName: true },
        ],
      });
      const result = await client.query(op.query, op.variables).toPromise();
      const summaryMap = new Map(
        ((result.data?.userSummaries as UserSummary[]) ?? []).map((u: UserSummary) => [u.name, u])
      );

      grouped.users = grouped.users.map((item) => {
        const name = item.resource.metadata?.name;
        if (!name) return item;
        const summary = summaryMap.get(name);
        if (!summary) return item;
        return {
          ...item,
          resource: {
            ...item.resource,
            spec: {
              ...item.resource.spec,
              ...(summary.email != null && { email: summary.email }),
              ...(summary.givenName != null && { givenName: summary.givenName }),
              ...(summary.familyName != null && { familyName: summary.familyName }),
            },
          },
        } as typeof item;
      });
    }
  } catch {
    // keep partial results
  }

  return grouped;
}

// Legacy individual queries kept for backward compatibility (used by useSearchUsersQuery etc.)
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

async function executeSearch<T>(
  queryBody: NetMiloapisGoSearchPkgApisSearchV1Alpha1ResourceSearchQuery
): Promise<T[]> {
  const response = await createSearchMiloapisComV1Alpha1ResourceSearchQuery({
    baseURL: PROXY_URL,
    body: queryBody,
    headers: { 'Content-Type': 'application/json' },
  });

  const results = response.data?.data?.status?.results ?? [];

  return results
    .slice()
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
    .map((result) => result.resource as T);
}

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
    const names = results
      .map((user) => user.metadata?.name)
      .filter((name): name is string => !!name);

    if (names.length === 0) return results;

    const client = createGqlClient({ type: 'global' });
    const op = generateQueryOp({
      userSummaries: [{ names }, { name: true, email: true, givenName: true, familyName: true }],
    });
    const result = await client.query(op.query, op.variables).toPromise();
    const summaryMap = new Map(
      ((result.data?.userSummaries as UserSummary[]) ?? []).map((u: UserSummary) => [u.name, u])
    );

    return results.map((user) => {
      const name = user.metadata?.name;
      if (!name) return user;
      const summary = summaryMap.get(name);
      if (!summary) return user;
      return {
        ...user,
        spec: {
          ...user.spec,
          ...(summary.email != null && { email: summary.email }),
          ...(summary.givenName != null && { givenName: summary.givenName }),
          ...(summary.familyName != null && { familyName: summary.familyName }),
        },
      } as ComMiloapisIamV1Alpha1User;
    });
  } catch {
    return results;
  }
};

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

const SEARCH_PAGE_LIMIT = 100;
// Safety ceiling, not a product limit: stops an unbounded search index from
// making the page fetch forever. At 100/page this is 20 requests / 2000 rows
// per resource kind — comfortably past any real dataset we expect today.
const SEARCH_MAX_PAGES = 20;

/**
 * Fetches one page of a single resource kind from the search index.
 */
async function searchResourcePage<T>(
  target: NetMiloapisGoSearchPkgApisSearchV1Alpha1TargetResource,
  queryString: string,
  cursor?: string
): Promise<{ items: SearchResultItem<T>[]; continue?: string }> {
  const body: NetMiloapisGoSearchPkgApisSearchV1Alpha1ResourceSearchQuery = {
    apiVersion: 'search.miloapis.com/v1alpha1',
    kind: 'ResourceSearchQuery',
    metadata: {
      name: `query-${target.kind.toLowerCase()}-list-${Date.now()}`,
    },
    spec: {
      query: queryString,
      limit: SEARCH_PAGE_LIMIT,
      targetResources: [target],
      ...(cursor && { continue: cursor }),
    },
  };

  const response = await createSearchMiloapisComV1Alpha1ResourceSearchQuery({
    baseURL: PROXY_URL,
    body,
    headers: { 'Content-Type': 'application/json' },
  });

  const status = response.data?.data?.status;
  const items = (status?.results ?? [])
    .slice()
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
    .map((result) => ({
      resource: result.resource as T,
      tenant: result.tenant,
    }));

  return { items, continue: status?.continue };
}

/**
 * List every resource of a single kind across all projects via the search
 * index, preserving tenant info so callers can resolve the owning project
 * per row.
 *
 * A single search response caps at 100 rows, so this walks `status.continue`
 * to fetch every page rather than silently dropping anything past the first
 * 100 — up to `SEARCH_MAX_PAGES` as a runaway-query safety net. `hasMore` is
 * true only if that safety net was hit while more pages were still available.
 */
async function searchResourceList<T>(
  target: NetMiloapisGoSearchPkgApisSearchV1Alpha1TargetResource,
  queryString: string = ''
): Promise<{ items: SearchResultItem<T>[]; hasMore: boolean }> {
  const items: SearchResultItem<T>[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < SEARCH_MAX_PAGES; page++) {
    const result = await searchResourcePage<T>(target, queryString, cursor);
    items.push(...result.items);
    cursor = result.continue;
    if (!cursor) return { items, hasMore: false };
  }

  return { items, hasMore: Boolean(cursor) };
}

/** List all Domains across every project via the search index. */
export const searchDomainsListQuery = (queryString: string = '') =>
  searchResourceList<ComDatumapisNetworkingV1AlphaDomain>(
    { group: 'networking.datumapis.com', version: 'v1alpha', kind: 'Domain' },
    queryString
  );

/** List all DNS zones across every project via the search index. */
export const searchDnsZonesListQuery = (queryString: string = '') =>
  searchResourceList<ComMiloapisNetworkingDnsV1Alpha1DnsZone>(
    { group: 'dns.networking.miloapis.com', version: 'v1alpha1', kind: 'DNSZone' },
    queryString
  );

/**
 * List all Application Load Balancer resources (HTTPProxy) across every project via the search
 * index. Surfaced in the UI as "Application Load Balancer".
 */
export const searchEdgesListQuery = (queryString: string = '') =>
  searchResourceList<ComDatumapisNetworkingV1AlphaHttpProxy>(
    { group: 'networking.datumapis.com', version: 'v1alpha', kind: 'HTTPProxy' },
    queryString
  );
