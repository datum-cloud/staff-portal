import { apiRequestClient } from '@/modules/axios/axios.client';
import { UserResponseSchema } from '@/resources/schemas/user.schema';

export interface UserQueryParams {
  limit?: number;
  nextToken?: string;
}

export const userQuery = (params?: UserQueryParams) => {
  return apiRequestClient({
    method: 'GET',
    url: '/apis/iam.miloapis.com/v1alpha1/users',
    params: {
      ...(params?.limit && { limit: params.limit }),
      ...(params?.nextToken && { continue: params.nextToken }),
    },
  })
    .output(UserResponseSchema)
    .execute();
};
