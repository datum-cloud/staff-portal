import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

// export const SecretSchema = z.object({
//   apiVersion: z.string(),
//   kind: z.literal('Secret'),
//   metadata: z.object({
//     creationTimestamp: z.string(),
//     generation: z.number().optional(),
//     managedFields: z
//       .array(
//         z.object({
//           apiVersion: z.string(),
//           fieldsType: z.string(),
//           fieldsV1: z.record(z.any()).optional(),
//           manager: z.string(),
//           operation: z.string(),
//           subresource: z.string().optional(),
//           time: z.string(),
//         })
//       )
//       .optional(),
//     name: z.string(),
//     namespace: z.string(),
//     resourceVersion: z.string(),
//     uid: z.string(),
//   }),
//   data: z.record(z.string()),
//   type: z.string(),
// });

// export const SecretListSchema = z.object({
//   apiVersion: z.string(),
//   items: z.array(SecretSchema),
//   kind: z.literal('SecretList'),
//   metadata: z.object({
//     continue: z.string().optional(),
//     resourceVersion: z.string(),
//   }),
// });

// export type Secret = z.infer<typeof SecretSchema>;
// export type SecretList = z.infer<typeof SecretListSchema>;

// export const SecretListResponseSchema = createProxyResponseSchema(SecretListSchema);
// export type SecretListResponse = z.infer<typeof SecretListResponseSchema>;

// export const SecretResponseSchema = createProxyResponseSchema(SecretSchema);
// export type SecretResponse = z.infer<typeof SecretResponseSchema>;

export const SecretSchema = z.object({
  metric: z.object({
    __name__: z.string(),
    job: z.string(),
    resource_kind: z.string(),
    resource_name: z.string(),
    resource_namespace: z.string(),
    resource_version: z.string(),
    resourcemanager_datumapis_com_project_name: z.string(),
    service_name: z.string(),
  }),
  value: z.tuple([z.number(), z.string()]),
});

export const SecretPrometheusDataSchema = z.object({
  resultType: z.literal('vector'),
  result: z.array(SecretSchema),
});

export const SecretPrometheusStatsSchema = z.object({
  seriesFetched: z.string(),
  executionTimeMsec: z.number(),
});

export const SecretListSchema = z.object({
  status: z.literal('success'),
  data: SecretPrometheusDataSchema,
  stats: SecretPrometheusStatsSchema,
});

export type Secret = z.infer<typeof SecretSchema>;
export type SecretList = z.infer<typeof SecretListSchema>;

export const SecretListResponseSchema = createProxyResponseSchema(SecretListSchema);
export type SecretListResponse = z.infer<typeof SecretListResponseSchema>;
