import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const SecretSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Secret'),
  metadata: z.object({
    creationTimestamp: z.string(),
    generation: z.number().optional(),
    managedFields: z
      .array(
        z.object({
          apiVersion: z.string(),
          fieldsType: z.string(),
          fieldsV1: z.record(z.any()).optional(),
          manager: z.string(),
          operation: z.string(),
          subresource: z.string().optional(),
          time: z.string(),
        })
      )
      .optional(),
    name: z.string(),
    namespace: z.string(),
    resourceVersion: z.string(),
    uid: z.string(),
  }),
  data: z.record(z.string()),
  type: z.string(),
});

export const SecretListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(SecretSchema),
  kind: z.literal('SecretList'),
  metadata: z.object({
    continue: z.string().optional(),
    resourceVersion: z.string(),
  }),
});

export type Secret = z.infer<typeof SecretSchema>;
export type SecretList = z.infer<typeof SecretListSchema>;

export const SecretListResponseSchema = createProxyResponseSchema(SecretListSchema);
export type SecretListResponse = z.infer<typeof SecretListResponseSchema>;

export const SecretResponseSchema = createProxyResponseSchema(SecretSchema);
export type SecretResponse = z.infer<typeof SecretResponseSchema>;
