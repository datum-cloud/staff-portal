import { z } from 'zod';

export const AuthUserSchema = z.object({
  email: z.string().email(),
  email_verified: z.boolean(),
  family_name: z.string(),
  given_name: z.string(),
  locale: z.string(),
  name: z.string(),
  avatar: z.string().url().optional(),
  preferred_username: z.string(),
  sub: z.string(),
  updated_at: z.number(),
  'urn:zitadel:iam:org:id': z.string(),
  'urn:zitadel:iam:user:resourceowner:id': z.string(),
  'urn:zitadel:iam:user:resourceowner:name': z.string(),
  'urn:zitadel:iam:user:resourceowner:primary_domain': z.string(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;
