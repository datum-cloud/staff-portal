import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

// Individual User schema
export const UserSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('User'),
  metadata: z.object({
    creationTimestamp: z.string(),
    generation: z.number(),
    managedFields: z
      .array(
        z.object({
          apiVersion: z.string(),
          fieldsType: z.string(),
          fieldsV1: z.record(z.record(z.record(z.any()))).optional(),
          manager: z.string(),
          operation: z.string(),
          subresource: z.string().optional(),
          time: z.string(),
        })
      )
      .optional(),
    name: z.string(),
    resourceVersion: z.string(),
    uid: z.string(),
  }),
  spec: z.object({
    email: z.string().email(),
    familyName: z.string(),
    givenName: z.string(),
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
      state: z.string(),
    })
    .optional(),
});

// UserList metadata schema
const UserListMetadataSchema = z.object({
  continue: z.string(),
  resourceVersion: z.string(),
});

// UserList schema
export const UserListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(UserSchema),
  kind: z.literal('UserList'),
  metadata: UserListMetadataSchema,
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export const UserListResponseSchema = createProxyResponseSchema(UserListSchema);
export type UserListResponse = z.infer<typeof UserListResponseSchema>;

export type UserList = z.infer<typeof UserListSchema>;
export const UserResponseSchema = createProxyResponseSchema(UserSchema);
export type UserResponse = z.infer<typeof UserResponseSchema>;

export const UserDeactivateSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  metadata: z.object({
    name: z.string(),
  }),
  spec: z.object({
    deactivatedBy: z.string(),
    description: z.string(),
    reason: z.string(),
    userRef: z.object({
      name: z.string(),
    }),
  }),
});

export type UserDeactivate = z.infer<typeof UserDeactivateSchema>;

export const UserDeactivationSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('UserDeactivation'),
  metadata: z.object({
    creationTimestamp: z.string(),
    finalizers: z.array(z.string()).optional(),
    generation: z.number(),
    managedFields: z
      .array(
        z.object({
          apiVersion: z.string(),
          fieldsType: z.string(),
          fieldsV1: z.record(z.record(z.record(z.any()))).optional(),
          manager: z.string(),
          operation: z.string(),
          subresource: z.string().optional(),
          time: z.string(),
        })
      )
      .optional(),
    name: z.string(),
    resourceVersion: z.string(),
    uid: z.string(),
  }),
  spec: z.object({
    deactivatedBy: z.string(),
    description: z.string().optional(),
    reason: z.string(),
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

export type UserDeactivation = z.infer<typeof UserDeactivationSchema>;
export const UserDeactivationResponseSchema = createProxyResponseSchema(UserDeactivationSchema);
export type UserDeactivationResponse = z.infer<typeof UserDeactivationResponseSchema>;
