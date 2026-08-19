import {
  getBasicAuthState,
  getParanoiaLevels,
  getTrafficProtectionMode,
  parseHtpasswdUsernames,
  toHttpProxy,
  type EdgeDetailBundle,
} from '@/features/edge/lib';
import { env } from '@/utils/config/env.server';
import { readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';
import {
  readNetworkingDatumapisComV1AlphaNamespacedDomain,
  readNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  readNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy,
} from '@openapi/networking.datumapis.com/v1alpha';
import { listNotesMiloapisComV1Alpha1NamespacedNote } from '@openapi/notes.miloapis.com/v1alpha1';
import {
  readResourcemanagerMiloapisComV1Alpha1Project,
  readResourcemanagerMiloapisComV1Alpha1ProjectSuspension,
} from '@openapi/resourcemanager.miloapis.com/v1alpha1';
import { UnwrapProxyResponse } from '@openapi/shared/core/types.gen';
import { readTelemetryMiloapisComV1Alpha1NamespacedExportPolicy } from '@openapi/telemetry.miloapis.com/v1alpha1';

export const projectDetailQuery = async (token: string, projectName: string) => {
  const response = await readResourcemanagerMiloapisComV1Alpha1Project({
    path: {
      name: projectName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as unknown as UnwrapProxyResponse<typeof response.data>;
};

/** Reads a single ProjectSuspension by name (cluster-scoped) — for the suspended-project detail. */
export const projectSuspensionDetailQuery = async (token: string, name: string) => {
  const response = await readResourcemanagerMiloapisComV1Alpha1ProjectSuspension({
    path: {
      name,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as unknown as UnwrapProxyResponse<typeof response.data>;
};

export const projectEdgeDetailQuery = async (
  token: string,
  projectName: string,
  edgeName: string,
  namespace: string = 'default'
) => {
  const response = await readNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
    baseURL: `${env.API_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    path: {
      namespace,
      name: edgeName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as unknown as UnwrapProxyResponse<typeof response.data>;
};

const projectControlPlaneBaseUrl = (projectName: string) =>
  `${env.API_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`;

async function fetchControlPlaneJson<T>(
  token: string,
  projectName: string,
  path: string
): Promise<T | null> {
  const response = await fetch(`${projectControlPlaneBaseUrl(projectName)}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  // 404: the resource doesn't exist. 403: the viewer isn't allowed to read
  // it (e.g. staff users can't read customer Secrets). Both are expected for
  // these optional enrichment fetches, so render the page without them
  // instead of failing the whole loader.
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) {
    throw new Response(`Control plane request failed: ${response.status}`, {
      status: response.status,
    });
  }

  return (await response.json()) as T;
}

export const projectEdgeDetailBundleQuery = async (
  token: string,
  projectName: string,
  edgeName: string,
  namespace: string = 'default'
): Promise<EdgeDetailBundle> => {
  const baseURL = projectControlPlaneBaseUrl(projectName);
  const headers = { Authorization: `Bearer ${token}` };

  const [proxyResponse, wafResponse, securityPolicy, basicAuthSecret] = await Promise.all([
    readNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
      baseURL,
      path: { namespace, name: edgeName },
      headers,
    }),
    readNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
      baseURL,
      path: { namespace, name: edgeName },
      headers,
    }).catch(() => null),
    fetchControlPlaneJson<unknown>(
      token,
      projectName,
      `/apis/gateway.envoyproxy.io/v1alpha1/namespaces/${namespace}/securitypolicies/${edgeName}`
    ),
    fetchControlPlaneJson<unknown>(
      token,
      projectName,
      `/api/v1/namespaces/${namespace}/secrets/${edgeName}-basic-auth`
    ),
  ]);

  const raw = proxyResponse.data as unknown as UnwrapProxyResponse<typeof proxyResponse.data>;
  const wafData = wafResponse?.data as unknown as
    | UnwrapProxyResponse<NonNullable<typeof wafResponse>['data']>
    | undefined;

  const usernames = parseHtpasswdUsernames(basicAuthSecret);
  const basicAuth = getBasicAuthState(securityPolicy, usernames);
  const trafficProtectionMode = getTrafficProtectionMode(wafData ?? null);
  const paranoiaLevels = getParanoiaLevels(wafData ?? null);

  const proxy = toHttpProxy(raw, {
    ...(trafficProtectionMode !== undefined && { trafficProtectionMode }),
    ...(paranoiaLevels !== undefined && { paranoiaLevels }),
    basicAuth,
  });

  return { raw, proxy };
};

export const projectExportPolicyDetailQuery = async (
  token: string,
  projectName: string,
  exportPolicyName: string,
  namespace: string = 'default'
) => {
  const response = await readTelemetryMiloapisComV1Alpha1NamespacedExportPolicy({
    baseURL: `${env.API_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    path: {
      namespace,
      name: exportPolicyName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as unknown as UnwrapProxyResponse<typeof response.data>;
};

export const projectDnsDetailQuery = async (
  token: string,
  projectName: string,
  dnsName: string,
  namespace: string = 'default'
) => {
  const response = await readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
    baseURL: `${env.API_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    path: {
      namespace,
      name: dnsName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as unknown as UnwrapProxyResponse<typeof response.data>;
};

export const projectDomainDetailQuery = async (
  token: string,
  projectName: string,
  domainName: string,
  namespace: string = 'default'
) => {
  const response = await readNetworkingDatumapisComV1AlphaNamespacedDomain({
    baseURL: `${env.API_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    path: {
      namespace,
      name: domainName,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as unknown as UnwrapProxyResponse<typeof response.data>;
};

export const projectDomainNotesQuery = async (
  token: string,
  projectName: string,
  domainName: string,
  namespace: string = 'default'
) => {
  const response = await listNotesMiloapisComV1Alpha1NamespacedNote({
    baseURL: `${env.API_URL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane`,
    path: {
      namespace,
    },
    query: {
      fieldSelector: `spec.subjectRef.name=${domainName},spec.subjectRef.kind=Domain`,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data as unknown as UnwrapProxyResponse<typeof response.data>;
};
