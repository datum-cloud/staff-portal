import { z } from 'zod';

export const AuthUserSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
    image: z.string().url(),
    accessToken: z.string(),
    refreshToken: z.string(),
    internal: z.boolean(),
    organization: z.string().uuid(),
    sub: z.string().uuid(),
    userId: z.string().uuid(),
    userEntityId: z.string(),
  }),
  expires: z.string().datetime(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;
