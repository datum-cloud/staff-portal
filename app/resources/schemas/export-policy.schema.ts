import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const ExportPolicySchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('ExportPolicy'),
  metadata: z.object({
    creationTimestamp: z.string(),
    finalizers: z.array(z.string()).optional(),
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
    sinks: z.array(
      z.object({
        name: z.string(),
        sources: z.array(z.string()),
        target: z.object({
          prometheusRemoteWrite: z.object({
            batch: z.object({
              maxSize: z.number(),
              timeout: z.string(),
            }),
            endpoint: z.string(),
            retry: z.object({
              backoffDuration: z.string(),
              maxAttempts: z.number(),
            }),
          }),
        }),
      })
    ),
    sources: z.array(
      z.object({
        metrics: z.object({
          metricsql: z.string(),
        }),
        name: z.string(),
      })
    ),
  }),
  status: z.object({
    conditions: z.array(
      z.object({
        lastTransitionTime: z.string(),
        message: z.string(),
        observedGeneration: z.number().optional(),
        reason: z.string(),
        status: z.string(),
        type: z.string(),
      })
    ),
    sinks: z.array(
      z.object({
        conditions: z.array(
          z.object({
            lastTransitionTime: z.string(),
            message: z.string(),
            observedGeneration: z.number().optional(),
            reason: z.string(),
            status: z.string(),
            type: z.string(),
          })
        ),
        name: z.string(),
      })
    ),
  }),
});

export const ExportPolicyListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(ExportPolicySchema),
  kind: z.literal('ExportPolicyList'),
  metadata: z.object({
    continue: z.string(),
    resourceVersion: z.string(),
  }),
});

export type ExportPolicy = z.infer<typeof ExportPolicySchema>;
export type ExportPolicyList = z.infer<typeof ExportPolicyListSchema>;

export const ExportPolicyListResponseSchema = createProxyResponseSchema(ExportPolicyListSchema);
export type ExportPolicyListResponse = z.infer<typeof ExportPolicyListResponseSchema>;

export const ExportPolicyResponseSchema = createProxyResponseSchema(ExportPolicySchema);
export type ExportPolicyResponse = z.infer<typeof ExportPolicyResponseSchema>;
