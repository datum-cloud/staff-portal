import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const ProjectSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Project'),
  metadata: z.object({
    annotations: z
      .object({
        'kubernetes.io/description': z.string(),
      })
      .optional(),
    creationTimestamp: z.string(),
    finalizers: z.array(z.string()).optional(),
    generation: z.number(),
    labels: z
      .object({
        'resourcemanager.miloapis.com/organization-name': z.string(),
      })
      .optional(),
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
    ownerRef: z.object({
      kind: z.string(),
      name: z.string(),
    }),
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
  }),
});

export const ProjectListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(ProjectSchema),
  kind: z.literal('ProjectList'),
  metadata: z.object({
    continue: z.string(),
    resourceVersion: z.string(),
  }),
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectList = z.infer<typeof ProjectListSchema>;

export const ProjectListResponseSchema = createProxyResponseSchema(ProjectListSchema);
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;

export const ProjectResponseSchema = createProxyResponseSchema(ProjectSchema);
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
