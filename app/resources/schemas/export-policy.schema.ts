import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

// ManagedField schema (shared with other schemas)
const ManagedFieldSchema = z.object({
  apiVersion: z.string(),
  fieldsType: z.string(),
  fieldsV1: z.record(z.any()).optional(),
  manager: z.string(),
  operation: z.string(),
  subresource: z.string().optional(),
  time: z.string(),
});

// ExportPolicy metadata schema
const ExportPolicyMetadataSchema = z.object({
  creationTimestamp: z.string(),
  finalizers: z.array(z.string()).optional(),
  generation: z.number(),
  managedFields: z.array(ManagedFieldSchema).optional(),
  name: z.string(),
  namespace: z.string(),
  resourceVersion: z.string(),
  uid: z.string(),
});

// Prometheus remote write target configuration
const PrometheusRemoteWriteSchema = z.object({
  batch: z.object({
    maxSize: z.number(),
    timeout: z.string(),
  }),
  endpoint: z.string(),
  retry: z.object({
    backoffDuration: z.string(),
    maxAttempts: z.number(),
  }),
});

// Target schema for sinks
const TargetSchema = z.object({
  prometheusRemoteWrite: PrometheusRemoteWriteSchema,
});

// Sink schema
const SinkSchema = z.object({
  name: z.string(),
  sources: z.array(z.string()),
  target: TargetSchema,
});

// Metrics configuration schema
const MetricsSchema = z.object({
  metricsql: z.string(),
});

// Source schema
const SourceSchema = z.object({
  metrics: MetricsSchema,
  name: z.string(),
});

// ExportPolicy spec schema
const ExportPolicySpecSchema = z.object({
  sinks: z.array(SinkSchema),
  sources: z.array(SourceSchema),
});

// Condition schema for status
const ConditionSchema = z.object({
  lastTransitionTime: z.string(),
  message: z.string(),
  observedGeneration: z.number().optional(),
  reason: z.string(),
  status: z.string(),
  type: z.string(),
});

// Status sink schema
const StatusSinkSchema = z.object({
  conditions: z.array(ConditionSchema),
  name: z.string(),
});

// ExportPolicy status schema
const ExportPolicyStatusSchema = z.object({
  conditions: z.array(ConditionSchema),
  sinks: z.array(StatusSinkSchema),
});

// Individual ExportPolicy schema
export const ExportPolicySchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('ExportPolicy'),
  metadata: ExportPolicyMetadataSchema,
  spec: ExportPolicySpecSchema,
  status: ExportPolicyStatusSchema,
});

// ExportPolicyList metadata schema
const ExportPolicyListMetadataSchema = z.object({
  continue: z.string(),
  resourceVersion: z.string(),
});

// ExportPolicyList schema
export const ExportPolicyListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(ExportPolicySchema),
  kind: z.literal('ExportPolicyList'),
  metadata: ExportPolicyListMetadataSchema,
});

// Type exports
export type ExportPolicy = z.infer<typeof ExportPolicySchema>;
export type ExportPolicyList = z.infer<typeof ExportPolicyListSchema>;

export const ExportPolicyListResponseSchema = createProxyResponseSchema(ExportPolicyListSchema);
export type ExportPolicyListResponse = z.infer<typeof ExportPolicyListResponseSchema>;

export const ExportPolicyResponseSchema = createProxyResponseSchema(ExportPolicySchema);
export type ExportPolicyResponse = z.infer<typeof ExportPolicyResponseSchema>;
