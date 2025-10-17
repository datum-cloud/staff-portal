import { apiRequest } from '@/modules/axios/axios.server';
import { ContactGroupSchema } from '@/resources/schemas';

export const contactGroupDetailQuery = (
  token: string,
  contactGroupName: string,
  namespace: string = 'default'
) => {
  return apiRequest({
    method: 'GET',
    url: `/apis/notification.miloapis.com/v1alpha1/namespaces/${namespace}/contactgroups/${contactGroupName}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(ContactGroupSchema)
    .execute();
};
