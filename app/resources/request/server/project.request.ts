import { apiRequest } from '@/modules/axios/axios.server';
import {
  HTTPProxySchema,
  ProjectSchema,
  ExportPolicySchema,
  DomainSchema,
} from '@/resources/schemas';

export const projectDetailQuery = (token: string, projectName: string) => {
  return apiRequest({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(ProjectSchema)
    .execute();
};

export const projectHttpProxyDetailQuery = (
  token: string,
  projectName: string,
  httpProxyName: string,
  namespace: string = 'default'
) => {
  return apiRequest({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/networking.datumapis.com/v1alpha/namespaces/${namespace}/httpproxies/${httpProxyName}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(HTTPProxySchema)
    .execute();
};

export const projectExportPolicyDetailQuery = (
  token: string,
  projectName: string,
  exportPolicyName: string,
  namespace: string = 'default'
) => {
  return apiRequest({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/telemetry.miloapis.com/v1alpha1/namespaces/${namespace}/exportpolicies/${exportPolicyName}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(ExportPolicySchema)
    .execute();
};

export const projectDomainDetailQuery = (
  token: string,
  projectName: string,
  domainName: string,
  namespace: string = 'default'
) => {
  return apiRequest({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/networking.datumapis.com/v1alpha/namespaces/${namespace}/domains/${domainName}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(DomainSchema)
    .execute();
};
