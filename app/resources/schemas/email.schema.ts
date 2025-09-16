import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const EmailSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Email'),
  metadata: z.object({
    annotations: z.record(z.string()).optional(),
    creationTimestamp: z.string(),
    generation: z.number(),
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
  spec: z.object({
    priority: z.string(),
    templateRef: z.object({
      name: z.string(),
    }),
    userRef: z.object({
      name: z.string(),
    }),
    variables: z.array(
      z.object({
        name: z.string(),
        value: z.string(),
      })
    ),
  }),
  status: z.object({
    conditions: z.array(
      z.object({
        lastTransitionTime: z.string(),
        message: z.string(),
        reason: z.string(),
        status: z.string(),
        type: z.string(),
      })
    ),
    providerID: z.string(),
  }),
});

export const EmailListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(EmailSchema),
  kind: z.literal('EmailList'),
  metadata: z.object({
    continue: z.string(),
    resourceVersion: z.string(),
  }),
});

export type Email = z.infer<typeof EmailSchema>;
export type EmailList = z.infer<typeof EmailListSchema>;

export const EmailListResponseSchema = createProxyResponseSchema(EmailListSchema);
export type EmailListResponse = z.infer<typeof EmailListResponseSchema>;

export const EmailResponseSchema = createProxyResponseSchema(EmailSchema);
export type EmailResponse = z.infer<typeof EmailResponseSchema>;
