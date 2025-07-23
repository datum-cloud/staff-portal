import { apiRequestClient } from '@/modules/axios/axios.client';
import { ListQueryParams } from '@/resources/schemas/common.schema';
import { OrganizationListResponseSchema } from '@/resources/schemas/organization.schema';
import { ProjectListResponseSchema } from '@/resources/schemas/project.schema';

export const orgListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/resourcemanager.miloapis.com/v1alpha1/organizations',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(OrganizationListResponseSchema)
    .execute();
};

export const orgProjectListQuery = (orgName: string, params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}/control-plane/apis/resourcemanager.miloapis.com/v1alpha1/projects`,
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(ProjectListResponseSchema)
    .execute();
};

export const orgDeleteMutation = (orgName: string) => {
  return apiRequestClient({
    method: 'DELETE',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}`,
  }).execute();
};
