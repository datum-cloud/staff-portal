import { apiRequestClient } from '@/modules/axios/axios.client';
import {
  DomainListResponseSchema,
  DomainResponseSchema,
  ExportPolicyListResponseSchema,
  HTTPProxyListResponseSchema,
  ListQueryParams,
  ProjectListResponseSchema,
} from '@/resources/schemas';
import { useQuery } from '@tanstack/react-query';

export const projectListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/resourcemanager.miloapis.com/v1alpha1/projects',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
      ...(params?.search && { fieldSelector: `metadata.name=${params.search}` }),
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

export const useProjectListQuery = (params?: ListQueryParams) => {
  return useQuery({
    queryKey: ['projects', 'list', params],
    queryFn: () => projectListQuery(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
