import { apiRequest } from '@/modules/axios';
import { AuthUserSchema } from '@/resources/schemas/auth.schema';

export const authUserQuery = (cookie: string) =>
  apiRequest({
    method: 'GET',
    url: `/auth/session`,
    headers: {
      Cookie: cookie,
    },
  })
    .output(AuthUserSchema)
    .execute();
