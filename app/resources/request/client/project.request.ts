import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  ListQueryParams,
  HTTPProxyListResponseSchema,
  ProjectListResponseSchema,
  ExportPolicyListResponseSchema,
  DomainListResponseSchema,
  DomainResponseSchema,
  SecretListResponseSchema,
} from '@/resources/schemas';

export const projectListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(ProjectListResponseSchema)
    .execute();
};

export const projectHttpProxyListQuery = (projectName: string, params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/networking.datumapis.com/v1alpha/httpproxies`,
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(HTTPProxyListResponseSchema)
    .execute();
};

export const projectExportPolicyListQuery = (projectName: string, params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/telemetry.miloapis.com/v1alpha1/namespaces/default/exportpolicies`,
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(ExportPolicyListResponseSchema)
    .execute();
};

export const projectDomainListQuery = (projectName: string, params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/networking.datumapis.com/v1alpha/domains`,
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(DomainListResponseSchema)
    .execute();
};

export const projectSecretListQuery = (projectName: string, params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '',
    baseURL: `/api/secrets/${projectName}`,
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(SecretListResponseSchema)
    .execute();
};

export const projectDomainStatusQuery = (
  projectName: string,
  domainName: string,
  namespace: string = 'default'
) => {
  return apiRequestClient({
    method: 'GET',
    url: `apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}/control-plane/apis/networking.datumapis.com/v1alpha/namespaces/${namespace}/domains/${domainName}/status`,
  })
    .output(DomainResponseSchema)
    .execute();
};

export const projectDeleteMutation = (projectName: string) => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}`,
  }).execute();
};
