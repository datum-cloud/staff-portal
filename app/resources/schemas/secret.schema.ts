import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

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
