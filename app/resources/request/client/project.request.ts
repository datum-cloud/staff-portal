import { apiRequestClient } from '@/modules/axios/axios.client';
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
