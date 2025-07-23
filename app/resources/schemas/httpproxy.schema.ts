import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

// ManagedField schema
const ManagedFieldSchema = z.object({
  apiVersion: z.string(),
  fieldsType: z.string(),
  fieldsV1: z.record(z.any()).optional(),
  manager: z.string(),
  operation: z.string(),
  subresource: z.string().optional(),
  time: z.string(),
});

// HTTPProxy metadata schema
const HTTPProxyMetadataSchema = z.object({
  annotations: z
    .object({
      'kubectl.kubernetes.io/last-applied-configuration': z.string(),
    })
    .optional(),
  creationTimestamp: z.string(),
  generation: z.number(),
  managedFields: z.array(ManagedFieldSchema).optional(),
  name: z.string(),
  namespace: z.string(),
  resourceVersion: z.string(),
  uid: z.string(),
});

// HTTPProxy backend schema
const HTTPProxyBackendSchema = z.object({
  endpoint: z.string(),
});

// HTTPProxy path match schema
const HTTPProxyPathMatchSchema = z.object({
  type: z.string(),
  value: z.string(),
});

// HTTPProxy match schema
const HTTPProxyMatchSchema = z.object({
  path: HTTPProxyPathMatchSchema,
});

// HTTPProxy rule schema
const HTTPProxyRuleSchema = z.object({
  backends: z.array(HTTPProxyBackendSchema),
  matches: z.array(HTTPProxyMatchSchema),
});

// HTTPProxy spec schema
const HTTPProxySpecSchema = z.object({
  rules: z.array(HTTPProxyRuleSchema),
});

// HTTPProxy address schema
const HTTPProxyAddressSchema = z.object({
  type: z.string(),
  value: z.string(),
});

// HTTPProxy condition schema
const HTTPProxyConditionSchema = z.object({
  lastTransitionTime: z.string(),
  message: z.string(),
  observedGeneration: z.number(),
  reason: z.string(),
  status: z.string(),
  type: z.string(),
});

// HTTPProxy status schema
const HTTPProxyStatusSchema = z.object({
  addresses: z.array(HTTPProxyAddressSchema),
  conditions: z.array(HTTPProxyConditionSchema),
  hostnames: z.array(z.string()),
});

// Individual HTTPProxy schema
export const HTTPProxySchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('HTTPProxy'),
  metadata: HTTPProxyMetadataSchema,
  spec: HTTPProxySpecSchema,
  status: HTTPProxyStatusSchema,
});

// HTTPProxyList metadata schema
const HTTPProxyListMetadataSchema = z.object({
  continue: z.string(),
  resourceVersion: z.string(),
});

// HTTPProxyList schema
export const HTTPProxyListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(HTTPProxySchema),
  kind: z.literal('HTTPProxyList'),
  metadata: HTTPProxyListMetadataSchema,
});

// Type exports
export type HTTPProxy = z.infer<typeof HTTPProxySchema>;
export type HTTPProxyList = z.infer<typeof HTTPProxyListSchema>;

export const HTTPProxyListResponseSchema = createProxyResponseSchema(HTTPProxyListSchema);
export type HTTPProxyListResponse = z.infer<typeof HTTPProxyListResponseSchema>;

export const HTTPProxyResponseSchema = createProxyResponseSchema(HTTPProxySchema);
export type HTTPProxyResponse = z.infer<typeof HTTPProxyResponseSchema>;
