import { apiRequest } from '@/modules/axios/axios.server';
import { UserSchema } from '@/resources/schemas/user.schema';

export const userDetailQuery = (token: string, userId: string) => {
  return apiRequest({
    method: 'GET',
    url: `/apis/iam.miloapis.com/v1alpha1/users/${userId}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(UserSchema)
    .execute();
};
