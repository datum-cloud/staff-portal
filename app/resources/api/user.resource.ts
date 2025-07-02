import { apiRequestClient } from '@/modules/axios/axios.client';
import { UserResponseSchema } from '@/resources/schemas/user.schema';

export const userQuery = () =>
  apiRequestClient({
    method: 'GET',
    url: '/apis/iam.miloapis.com/v1alpha1/users',
  })
    .output(UserResponseSchema)
    .execute();
