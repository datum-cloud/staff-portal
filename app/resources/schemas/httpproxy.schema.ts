import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const HTTPProxySchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('HTTPProxy'),
  metadata: z.object({
    annotations: z
      .object({
        'kubectl.kubernetes.io/last-applied-configuration': z.string(),
      })
      .optional(),
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
    rules: z.array(
      z.object({
        backends: z.array(
          z.object({
            endpoint: z.string(),
          })
        ),
        matches: z.array(
          z.object({
            path: z.object({
              type: z.string(),
              value: z.string(),
            }),
          })
        ),
      })
    ),
    hostnames: z.array(z.string()),
  }),
  status: z.object({
    addresses: z.array(
      z.object({
        type: z.string(),
        value: z.string(),
      })
    ),
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
    hostnames: z.array(z.string()),
  }),
});

export const HTTPProxyListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(HTTPProxySchema),
  kind: z.literal('HTTPProxyList'),
  metadata: z.object({
    continue: z.string(),
    resourceVersion: z.string(),
  }),
});

export type HTTPProxy = z.infer<typeof HTTPProxySchema>;
export type HTTPProxyList = z.infer<typeof HTTPProxyListSchema>;

export const HTTPProxyListResponseSchema = createProxyResponseSchema(HTTPProxyListSchema);
export type HTTPProxyListResponse = z.infer<typeof HTTPProxyListResponseSchema>;

export const HTTPProxyResponseSchema = createProxyResponseSchema(HTTPProxySchema);
export type HTTPProxyResponse = z.infer<typeof HTTPProxyResponseSchema>;
