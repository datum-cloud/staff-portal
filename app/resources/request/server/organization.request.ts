import { apiRequest } from '@/modules/axios/axios.server';
import { OrganizationSchema } from '@/resources/schemas/organization.schema';

export const orgDetailQuery = (token: string, orgName: string) => {
  return apiRequest({
    method: 'GET',
    url: `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgName}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(OrganizationSchema)
    .execute();
};
