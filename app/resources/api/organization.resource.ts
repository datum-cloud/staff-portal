import { apiRequestClient } from '@/modules/axios/axios.client';
import { ListQueryParams } from '@/resources/schemas/common.schema';
import { OrganizationResponseSchema } from '@/resources/schemas/org.schema';

export const orgQuery = (params?: ListQueryParams) => {
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
