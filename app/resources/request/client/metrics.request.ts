import { apiRequestClient } from '@/modules/axios/axios.client';
import { SecretListResponseSchema } from '@/resources/schemas';

export const metricsCreateMutation = (payload: any) => {
  return apiRequestClient({
    method: 'POST',
    url: '',
    baseURL: '/api/metrics',
    data: payload,
  })
    .output(SecretListResponseSchema)
    .execute();
};
