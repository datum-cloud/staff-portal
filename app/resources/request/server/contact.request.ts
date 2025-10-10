import { apiRequest } from '@/modules/axios/axios.server';
import { ContactSchema } from '@/resources/schemas';

export const contactDetailQuery = (
  token: string,
  contactName: string,
  namespace: string = 'default'
) => {
  return apiRequest({
    method: 'GET',
    url: `/apis/notification.miloapis.com/v1alpha1/namespaces/${namespace}/contacts/${contactName}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(ContactSchema)
    .execute();
};
