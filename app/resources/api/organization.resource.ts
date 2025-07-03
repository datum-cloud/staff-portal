import { apiRequestClient } from '@/modules/axios/axios.client';
import { OrganizationResponseSchema } from '@/resources/schemas/org.schema';

export interface OrgQueryParams {
  limit?: number;
  cursor?: string;
}

export const orgQuery = (params?: OrgQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/resourcemanager.miloapis.com/v1alpha1/organizations',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(OrganizationResponseSchema)
    .execute();
};
