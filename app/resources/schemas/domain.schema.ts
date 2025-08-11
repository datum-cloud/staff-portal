import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const DomainSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Domain'),
  metadata: z.object({
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
    domainName: z.string(),
  }),
  status: z.object({
    conditions: z.array(
      z.object({
        lastTransitionTime: z.string(),
        message: z.string(),
        observedGeneration: z.number(),
        reason: z.string(),
        status: z.string(),
        type: z.string(),
      })
    ),
    verification: z.object({
      dnsRecord: z.object({
        content: z.string(),
        name: z.string(),
        type: z.string(),
      }),
      httpToken: z.object({
        body: z.string(),
        url: z.string(),
      }),
      nextVerificationAttempt: z.string(),
    }),
  }),
});

export const DomainListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(DomainSchema),
  kind: z.literal('DomainList'),
  metadata: z.object({
    continue: z.string(),
    resourceVersion: z.string(),
  }),
});

export type Domain = z.infer<typeof DomainSchema>;
export type DomainList = z.infer<typeof DomainListSchema>;

export const DomainListResponseSchema = createProxyResponseSchema(DomainListSchema);
export type DomainListResponse = z.infer<typeof DomainListResponseSchema>;

export const DomainResponseSchema = createProxyResponseSchema(DomainSchema);
export type DomainResponse = z.infer<typeof DomainResponseSchema>;
