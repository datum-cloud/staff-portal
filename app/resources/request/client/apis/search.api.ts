import { userGetQuery } from './user.api';
import { PROXY_URL } from '@/modules/axios/axios.client';
import { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';
import { ComMiloapisIamV1Alpha1User } from '@openapi/iam.miloapis.com/v1alpha1';
import { ComDatumapisNetworkingV1AlphaDomain } from '@openapi/networking.datumapis.com/v1alpha';
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
    grouped.users = await Promise.all(
      grouped.users.map(async (item) => {
        const name = item.resource.metadata?.name;
        if (!name) return item;
        try {
          const enriched = await userGetQuery(name);
          return enriched ? { ...item, resource: enriched } : item;
        } catch {
          return item;
        }
      })
    );
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
