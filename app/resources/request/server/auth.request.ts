import { apiRequest } from '@/modules/axios/axios.server';
import { AuthUserSchema } from '@/resources/schemas';
import { env } from '@/utils/config/env.server';

export const authUserQuery = (token: string) =>
  apiRequest({
    method: 'GET',
    url: '/oidc/v1/userinfo',
    baseURL: env.AUTH_OIDC_ISSUER,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .output(AuthUserSchema)
    .execute();
