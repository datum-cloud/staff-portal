import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const ResourceGrantSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('ResourceGrant'),
  metadata: z.object({
    annotations: z.record(z.string(), z.any()).optional(),
    creationTimestamp: z.string(),
    generation: z.number(),
    labels: z.record(z.string(), z.any()).optional(),
    managedFields: z
      .array(
        z.object({
          apiVersion: z.string(),
          fieldsType: z.string(),
          fieldsV1: z.record(z.string(), z.any()).optional(),
          manager: z.string(),
          operation: z.string(),
          subresource: z.string().optional(),
          time: z.string(),
        })
      )
      .optional(),
    name: z.string(),
    namespace: z.string().optional(),
    ownerReferences: z
      .array(
        z.object({
          apiVersion: z.string(),
          controller: z.boolean().optional(),
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
    allowances: z.array(
      z.object({
        resourceType: z.string(),
        buckets: z.array(
          z.object({
            amount: z.number(),
          })
        ),
      })
    ),
    consumerRef: z.object({
      apiGroup: z.string().optional(),
      kind: z.string(),
      name: z.string(),
      namespace: z.string().optional(),
    }),
  }),
  status: z
    .object({
      conditions: z
        .array(
          z.object({
            lastTransitionTime: z.string(),
            message: z.string(),
            observedGeneration: z.number(),
            reason: z.string(),
            status: z.string(),
            type: z.string(),
          })
        )
        .optional(),
      observedGeneration: z.number().optional(),
    })
    .optional(),
});

export const ResourceGrantListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(ResourceGrantSchema),
  kind: z.literal('ResourceGrantList'),
  metadata: z.object({
    continue: z.string().optional(),
    resourceVersion: z.string(),
  }),
});

export type ResourceGrant = z.infer<typeof ResourceGrantSchema>;
export type ResourceGrantList = z.infer<typeof ResourceGrantListSchema>;

export const ResourceGrantListResponseSchema = createProxyResponseSchema(ResourceGrantListSchema);
export type ResourceGrantListResponse = z.infer<typeof ResourceGrantListResponseSchema>;

export const ResourceGrantResponseSchema = createProxyResponseSchema(ResourceGrantSchema);
export type ResourceGrantResponse = z.infer<typeof ResourceGrantResponseSchema>;

export const AllowanceBucketSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('AllowanceBucket'),
  metadata: z.object({
    annotations: z.record(z.string(), z.any()).optional(),
    creationTimestamp: z.string(),
    generation: z.number(),
    labels: z.record(z.string(), z.any()).optional(),
    managedFields: z
      .array(
        z.object({
          apiVersion: z.string(),
          fieldsType: z.string(),
          fieldsV1: z.record(z.string(), z.any()).optional(),
          manager: z.string(),
          operation: z.string(),
          subresource: z.string().optional(),
          time: z.string(),
        })
      )
      .optional(),
    name: z.string(),
    namespace: z.string().optional(),
    resourceVersion: z.string(),
    uid: z.string(),
  }),
  spec: z.object({
    consumerRef: z.object({
      apiGroup: z.string().optional(),
      kind: z.string(),
      name: z.string(),
      namespace: z.string().optional(),
    }),
    resourceType: z.string(),
  }),
  status: z
    .object({
      allocated: z.number().optional(),
      available: z.number().optional(),
      claimCount: z.number().optional(),
      contributingGrantRefs: z
        .array(
          z.object({
            amount: z.number(),
            lastObservedGeneration: z.number(),
            name: z.string(),
          })
        )
        .optional(),
      grantCount: z.number().optional(),
      lastReconciliation: z.string().optional(),
      limit: z.number().optional(),
      observedGeneration: z.number().optional(),
    })
    .optional(),
});

export const AllowanceBucketListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(AllowanceBucketSchema),
  kind: z.literal('AllowanceBucketList'),
  metadata: z.object({
    continue: z.string().optional(),
    resourceVersion: z.string(),
  }),
});

export type AllowanceBucket = z.infer<typeof AllowanceBucketSchema>;
export type AllowanceBucketList = z.infer<typeof AllowanceBucketListSchema>;

export const AllowanceBucketListResponseSchema =
  createProxyResponseSchema(AllowanceBucketListSchema);
export type AllowanceBucketListResponse = z.infer<typeof AllowanceBucketListResponseSchema>;

export const AllowanceBucketResponseSchema = createProxyResponseSchema(AllowanceBucketSchema);
export type AllowanceBucketResponse = z.infer<typeof AllowanceBucketResponseSchema>;
