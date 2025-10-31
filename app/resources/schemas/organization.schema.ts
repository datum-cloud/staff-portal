import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const OrganizationSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Organization'),
  metadata: z.object({
    annotations: z
      .object({
        'kubernetes.io/display-name': z.string(),
      })
      .optional(),
    creationTimestamp: z.string(),
    generation: z.number(),
    managedFields: z
      .array(
        z.object({
          apiVersion: z.string(),
          fieldsType: z.string(),
          fieldsV1: z.record(z.string(), z.any()).optional(),
          manager: z.string(),
          operation: z.string(),
          time: z.string(),
        })
      )
      .optional(),
    name: z.string(),
    ownerReferences: z
      .array(
        z.object({
          apiVersion: z.string(),
          kind: z.string(),
          name: z.string(),
          uid: z.string(),
        })
      )
      .optional(),
    resourceVersion: z.string(),
    uid: z.string(),
  }),
  spec: z.object({
    type: z.string(),
  }),
});

export const OrganizationListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(OrganizationSchema),
  kind: z.literal('OrganizationList'),
  metadata: z.object({
    continue: z.string(),
    resourceVersion: z.string(),
  }),
});

export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationList = z.infer<typeof OrganizationListSchema>;

export const OrganizationListResponseSchema = createProxyResponseSchema(OrganizationListSchema);
export type OrganizationListResponse = z.infer<typeof OrganizationListResponseSchema>;

export const OrganizationResponseSchema = createProxyResponseSchema(OrganizationSchema);
export type OrganizationResponse = z.infer<typeof OrganizationResponseSchema>;
