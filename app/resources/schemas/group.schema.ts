import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const GroupSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Group'),
  metadata: z.object({
    creationTimestamp: z.string(),
    finalizers: z.array(z.string()).optional(),
    generation: z.number(),
    name: z.string(),
    namespace: z.string().optional(),
    resourceVersion: z.string(),
    uid: z.string(),
  }),
  status: z
    .object({
      conditions: z.array(
        z.object({
          lastTransitionTime: z.string(),
          message: z.string(),
          reason: z.string(),
          status: z.string(),
          type: z.string(),
        })
      ),
    })
    .optional(),
});

export const GroupListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(GroupSchema),
  kind: z.literal('GroupList'),
  metadata: z.object({
    continue: z.string().optional(),
    resourceVersion: z.string(),
  }),
});

export type Group = z.infer<typeof GroupSchema>;
export type GroupList = z.infer<typeof GroupListSchema>;

export const GroupListResponseSchema = createProxyResponseSchema(GroupListSchema);
export type GroupListResponse = z.infer<typeof GroupListResponseSchema>;

export const GroupResponseSchema = createProxyResponseSchema(GroupSchema);
export type GroupResponse = z.infer<typeof GroupResponseSchema>;

export const GroupMembershipSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('GroupMembership'),
  metadata: z.object({
    creationTimestamp: z.string(),
    finalizers: z.array(z.string()).optional(),
    generation: z.number(),
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
    namespace: z.string(),
    resourceVersion: z.string(),
    uid: z.string(),
  }),
  spec: z.object({
    groupRef: z.object({
      name: z.string(),
      namespace: z.string().optional(),
    }),
    userRef: z.object({
      name: z.string(),
    }),
  }),
  status: z
    .object({
      conditions: z.array(
        z.object({
          lastTransitionTime: z.string(),
          message: z.string(),
          reason: z.string(),
          status: z.string(),
          type: z.string(),
        })
      ),
    })
    .optional(),
});

export const GroupMembershipListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(GroupMembershipSchema),
  kind: z.literal('GroupMembershipList'),
  metadata: z.object({
    continue: z.string().optional(),
    resourceVersion: z.string(),
  }),
});

export type GroupMembership = z.infer<typeof GroupMembershipSchema>;
export type GroupMembershipList = z.infer<typeof GroupMembershipListSchema>;

export const GroupMembershipListResponseSchema =
  createProxyResponseSchema(GroupMembershipListSchema);
export type GroupMembershipListResponse = z.infer<typeof GroupMembershipListResponseSchema>;

export const GroupMembershipResponseSchema = createProxyResponseSchema(GroupMembershipSchema);
export type GroupMembershipResponse = z.infer<typeof GroupMembershipResponseSchema>;

export const GroupMembershipFiltersSchema = z.object({
  fieldSelector: z.string().optional(),
});

export type GroupMembershipFilters = z.infer<typeof GroupMembershipFiltersSchema>;

export const GroupMembershipCreateSchema = z.object({
  apiVersion: z.literal('iam.miloapis.com/v1alpha1'),
  kind: z.literal('GroupMembership'),
  metadata: z.object({
    namespace: z.string(),
    name: z.string().optional(),
    generateName: z.string().optional(),
  }),
  spec: z.object({
    groupRef: z.object({
      name: z.string(),
      namespace: z.string().optional(),
    }),
    userRef: z.object({
      name: z.string(),
    }),
  }),
});

export type GroupMembershipCreate = z.infer<typeof GroupMembershipCreateSchema>;
