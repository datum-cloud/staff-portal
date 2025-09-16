import { apiRequestClient } from '@/modules/axios/axios.client';
import { EmailListResponseSchema, ListQueryParams } from '@/resources/schemas';

export const emailListQuery = (params?: ListQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/notification.miloapis.com/v1alpha1/namespaces/milo-system/emails',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.cursor && { continue: params.cursor }),
    },
  })
    .output(EmailListResponseSchema)
    .execute();
};
