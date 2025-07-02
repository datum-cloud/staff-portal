import { apiRequestClient } from '@/modules/axios/axios.client';
import { OrganizationResponseSchema } from '@/resources/schemas/org.schema';

export const orgQuery = () =>
  apiRequestClient({
    method: 'GET',
    url: '/apis/resourcemanager.miloapis.com/v1alpha1/organizations',
  })
    .output(OrganizationResponseSchema)
    .execute();
