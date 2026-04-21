import { PROXY_URL } from '@/modules/axios/axios.client';
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
  deleteResourcemanagerMiloapisComV1Alpha1Project,
  listResourcemanagerMiloapisComV1Alpha1Project,
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

export const projectDeleteMutation = (projectName: string) => {
  return deleteResourcemanagerMiloapisComV1Alpha1Project({
    path: {
      name: projectName,
    },
  });
};
