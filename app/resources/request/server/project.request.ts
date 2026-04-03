import { env } from '@/utils/config/env.server';
import { readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone } from '@openapi/dns.networking.miloapis.com/v1alpha1';
import {
  readNetworkingDatumapisComV1AlphaNamespacedDomain,
  readNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
} from '@openapi/networking.datumapis.com/v1alpha';
import { listNotesMiloapisComV1Alpha1NamespacedNote } from '@openapi/notes.miloapis.com/v1alpha1';
import { readResourcemanagerMiloapisComV1Alpha1Project } from '@openapi/resourcemanager.miloapis.com/v1alpha1';
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
