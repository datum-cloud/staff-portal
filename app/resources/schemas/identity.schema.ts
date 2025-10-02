import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

// Identity Sessions API (virtual, delegated to provider)
// apiGroup: identity.miloapis.com/v1alpha1

export const IdentitySessionStatusSchema = z.object({
  userUID: z.string(),
  provider: z.string(),
  ip: z.string().optional(),
  createdAt: z.string(),
  expiresAt: z.string().optional(),
});

export const IdentitySessionSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Session'),
  metadata: z.object({
    name: z.string(),
    uid: z.string().optional(),
    resourceVersion: z.string().optional(),
    creationTimestamp: z.string().optional(),
  }),
  status: IdentitySessionStatusSchema.optional(),
});

export const IdentitySessionListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(IdentitySessionSchema),
  kind: z.literal('SessionList'),
  metadata: z
    .object({
      continue: z.string().optional(),
      resourceVersion: z.string().optional(),
    })
    .optional(),
});

export type IdentitySession = z.infer<typeof IdentitySessionSchema>;
export type IdentitySessionList = z.infer<typeof IdentitySessionListSchema>;

export const IdentitySessionListResponseSchema =
  createProxyResponseSchema(IdentitySessionListSchema);
export type IdentitySessionListResponse = z.infer<typeof IdentitySessionListResponseSchema>;

export const IdentitySessionResponseSchema = createProxyResponseSchema(IdentitySessionSchema);
export type IdentitySessionResponse = z.infer<typeof IdentitySessionResponseSchema>;
