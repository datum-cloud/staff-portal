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

// OwnerReference schema
const OwnerReferenceSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  name: z.string(),
  uid: z.string(),
});

// Project metadata schema
const ProjectMetadataSchema = z.object({
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
  managedFields: z.array(ManagedFieldSchema).optional(),
  name: z.string(),
  ownerReferences: z.array(OwnerReferenceSchema).optional(),
  resourceVersion: z.string(),
  uid: z.string(),
});

// Project spec schema
const ProjectSpecSchema = z.object({
  ownerRef: z.object({
    kind: z.string(),
    name: z.string(),
  }),
});

// Project status condition schema
const ProjectStatusConditionSchema = z.object({
  lastTransitionTime: z.string(),
  message: z.string(),
  observedGeneration: z.number(),
  reason: z.string(),
  status: z.string(),
  type: z.string(),
});

// Project status schema
const ProjectStatusSchema = z.object({
  conditions: z.array(ProjectStatusConditionSchema),
});

// Individual Project schema
export const ProjectSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Project'),
  metadata: ProjectMetadataSchema,
  spec: ProjectSpecSchema,
  status: ProjectStatusSchema,
});

// ProjectList metadata schema
const ProjectListMetadataSchema = z.object({
  continue: z.string(),
  resourceVersion: z.string(),
});

// ProjectList schema
export const ProjectListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(ProjectSchema),
  kind: z.literal('ProjectList'),
  metadata: ProjectListMetadataSchema,
});

// Type exports
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectList = z.infer<typeof ProjectListSchema>;

export const ProjectResponseSchema = createProxyResponseSchema(ProjectListSchema);
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
