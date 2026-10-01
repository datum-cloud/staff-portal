import { PROXY_URL } from '@/modules/axios/axios.client';
import { projectOp, projectsOp, type GqlProject } from '@/resources/gql/project.gql';
import { ListQueryParams } from '@/resources/schemas';
import { flattenManagedRecordSets } from '@/utils/helpers';
import {
  listDnsNetworkingMiloapisComV1Alpha1DnsZoneForAllNamespaces,
  listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSetStatus,
} from '@openapi/dns.networking.miloapis.com/v1alpha1';
import {
  listNetworkingDatumapisComV1AlphaDomainForAllNamespaces,
  listNetworkingDatumapisComV1AlphaHttpProxyForAllNamespaces,
  readNetworkingDatumapisComV1AlphaNamespacedDomainStatus,
} from '@openapi/networking.datumapis.com/v1alpha';
import {
  ComMiloapisResourcemanagerV1Alpha1ProjectSuspension,
  createResourcemanagerMiloapisComV1Alpha1ProjectSuspension,
  deleteResourcemanagerMiloapisComV1Alpha1Project,
  deleteResourcemanagerMiloapisComV1Alpha1ProjectSuspension,
  listResourcemanagerMiloapisComV1Alpha1Project,
  listResourcemanagerMiloapisComV1Alpha1ProjectSuspension,
  readResourcemanagerMiloapisComV1Alpha1Project,
  type ComMiloapisResourcemanagerV1Alpha1Project,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { listTelemetryMiloapisComV1Alpha1ExportPolicyForAllNamespaces } from '@openapi/telemetry.miloapis.com/v1alpha1';

export const projectListQuery = async (params?: ListQueryParams) => {
  const response = await listResourcemanagerMiloapisComV1Alpha1Project({
    query: {
      limit: params?.limit,
      continue: params?.cursor,
      ...(params?.search && { fieldSelector: `metadata.name=${params.search}` }),
    },
  });
  return response.data.data;
};

export const projectEdgeListQuery = async (projectName: string, params?: ListQueryParams) => {
  const response = await listNetworkingDatumapisComV1AlphaHttpProxyForAllNamespaces({
    baseURL: `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  });
  return response.data.data;
};

export const projectExportPolicyListQuery = async (
  projectName: string,
  params?: ListQueryParams
) => {
  const response = await listTelemetryMiloapisComV1Alpha1ExportPolicyForAllNamespaces({
    baseURL: `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  });
  return response.data.data;
};

export const projectDnsListQuery = async (projectName: string, params?: ListQueryParams) => {
  const response = await listDnsNetworkingMiloapisComV1Alpha1DnsZoneForAllNamespaces({
    baseURL: `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  });
  return response.data.data;
};

export const projectDnsRecordListQuery = async (
  projectName: string,
  dnsName: string,
  namespace: string = 'default'
) => {
  const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
    baseURL: `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    path: {
      namespace,
    },
    query: {
      fieldSelector: `spec.dnsZoneRef.name=${dnsName}`,
    },
  });

  const flattened = flattenManagedRecordSets(response.data.data);
  return flattened;
};

export const projectDnsRecordStatusQuery = async (
  projectName: string,
  dnsRecordName: string,
  namespace: string = 'default'
) => {
  const response = await readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSetStatus({
    baseURL: `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    path: {
      namespace,
      name: dnsRecordName,
    },
  });

  return response.data.data;
};

export const projectDomainListQuery = async (projectName: string, params?: ListQueryParams) => {
  const response = await listNetworkingDatumapisComV1AlphaDomainForAllNamespaces({
    baseURL: `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    query: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  });
  return response.data.data;
};

export const projectDomainStatusQuery = async (
  projectName: string,
  domainName: string,
  namespace: string = 'default'
) => {
  const response = await readNetworkingDatumapisComV1AlphaNamespacedDomainStatus({
    baseURL: `${PROXY_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    path: {
      namespace,
      name: domainName,
    },
  });
  return response.data.data;
};

export const projectGetQuery = async (
  projectName: string
): Promise<ComMiloapisResourcemanagerV1Alpha1Project | null> => {
  const response = await readResourcemanagerMiloapisComV1Alpha1Project({
    path: {
      name: projectName,
    },
    // Treat 404 as success so the axios error interceptor does not toast
    // when cleanup finishes and the project disappears.
    validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
  });
  if (response.status === 404) return null;
  return response.data.data;
};

export const projectDeleteMutation = (projectName: string) => {
  return deleteResourcemanagerMiloapisComV1Alpha1Project({
    path: {
      name: projectName,
    },
  });
};

/**
 * Lists every ProjectSuspension governing a project — active and lifted — for the
 * suspension panel + audit history. A project can carry more than one at a time
 * (e.g. Fraud + Billing); it stays suspended while any is Active.
 */
export const projectSuspensionForProjectListQuery = async (projectName: string) => {
  const response = await listResourcemanagerMiloapisComV1Alpha1ProjectSuspension({
    query: {
      fieldSelector: `spec.projectRef.name=${projectName}`,
    },
  });
  return response.data.data?.items ?? [];
};

/**
 * Lists every ProjectSuspension across all projects (ProjectSuspension is
 * cluster-scoped) — joined into the Projects list so a suspended project shows
 * a `Suspended` status. Callers filter to `status.phase === 'Active'` since
 * phase is not a selectable field.
 */
export const projectSuspensionListQuery = async () => {
  const response = await listResourcemanagerMiloapisComV1Alpha1ProjectSuspension({});
  return response.data.data?.items ?? [];
};

/** Suspends a project by creating a ProjectSuspension (its presence derives the Suspended state). */
export const projectSuspendMutation = async (
  payload: ComMiloapisResourcemanagerV1Alpha1ProjectSuspension['spec']
) => {
  const response = await createResourcemanagerMiloapisComV1Alpha1ProjectSuspension({
    query: { fieldManager: 'datum-staff-portal' },
    body: {
      apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
      kind: 'ProjectSuspension',
      metadata: { generateName: 'suspension-' },
      spec: payload,
    },
  });
  return response.data.data;
};

/** Lifts a suspension by deleting the ProjectSuspension resource (per its reinstateAuthority). */
export const projectLiftSuspensionMutation = (name: string) => {
  return deleteResourcemanagerMiloapisComV1Alpha1ProjectSuspension({
    path: { name },
  });
};

// ─── GraphQL-backed (gateway) ────────────────────────────────────────────────

export const listProjects = async (params?: {
  limit?: number;
  cursor?: string;
  search?: string;
}) => {
  const data = await projectsOp(params ?? {});
  const list = data?.projects;
  return {
    items: list?.items ?? [],
    continueToken: list?.continueToken ?? null,
  };
};

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
export const listAllProjects = async (
  search: string = ''
): Promise<{ items: GqlProject[]; hasMore: boolean }> => {
  const items: GqlProject[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < ALL_PROJECTS_MAX_PAGES; page++) {
    const result = await listProjects({ limit: ALL_PROJECTS_PAGE_LIMIT, cursor, search });
    items.push(...result.items);
    cursor = result.continueToken ?? undefined;
    if (!cursor) return { items, hasMore: false };
  }

  return { items, hasMore: Boolean(cursor) };
};

export const getProject = async (name: string): Promise<GqlProject | null> => {
  const data = await projectOp(name);
  return data?.project ?? null;
};
