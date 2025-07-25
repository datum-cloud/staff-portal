import { apiRequestClient } from '@/modules/axios/axios.client';
import { ProjectActivityListResponseSchema } from '@/resources/schemas/activity.schema';
import { ListQueryParams } from '@/resources/schemas/common.schema';
import { HTTPProxyListResponseSchema } from '@/resources/schemas/httpproxy.schema';
import { ProjectListResponseSchema } from '@/resources/schemas/project.schema';

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

export const projectDeleteMutation = (projectName: string) => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectName}`,
  }).execute();
};

export const projectActivityListQuery = (projectName: string, params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '',
    baseURL: '/api/activity',
    params: {
      // Only Write operations are logged
      actions: 'create,update,patch,delete,deletecollection',
      project: projectName,
      ...(params?.limit && { limit: params.limit }),
      ...(params?.filters?.start && { start: params.filters.start }), // Already in nanoseconds
      ...(params?.filters?.end && { end: params.filters.end }), // Already in nanoseconds
      ...(params?.search && { q: params.search }),
    },
  })
    .output(ProjectActivityListResponseSchema)
    .execute();
};
