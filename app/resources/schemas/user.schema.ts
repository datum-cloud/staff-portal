import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const UserSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('User'),
  metadata: z.object({
    annotations: z
      .object({
        'preferences/theme': z.string().optional(),
        'preferences/timezone': z.string().optional(),
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
      registrationApproval: z.enum(['Approved', 'Rejected', 'Pending']),
    })
    .optional(),
});

export const UserListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(UserSchema),
  kind: z.literal('UserList'),
  metadata: z.object({
    continue: z.string(),
    resourceVersion: z.string(),
  }),
});

export type User = z.infer<typeof UserSchema>;
export const UserListResponseSchema = createProxyResponseSchema(UserListSchema);
export type UserListResponse = z.infer<typeof UserListResponseSchema>;

export type UserList = z.infer<typeof UserListSchema>;
export const UserResponseSchema = createProxyResponseSchema(UserSchema);
export type UserResponse = z.infer<typeof UserResponseSchema>;

export const UserUpdateSchema = z.object({
  apiVersion: z.literal('iam.miloapis.com/v1alpha1'),
  kind: z.literal('User'),
  metadata: z
    .object({
      annotations: z
        .object({
          'preferences/theme': z.string().optional(),
          'preferences/timezone': z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  spec: z
    .object({
      familyName: z.string(),
      givenName: z.string(),
    })
    .optional(),
});

export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export const UserDeactivateSchema = z.object({
  apiVersion: z.literal('iam.miloapis.com/v1alpha1'),
  kind: z.literal('UserDeactivation'),
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
          fieldsV1: z.record(z.string(), z.any()).optional(),
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

export const UserApproveSchema = z.object({
  apiVersion: z.literal('iam.miloapis.com/v1alpha1'),
  kind: z.literal('PlatformAccessApproval'),
  metadata: z.object({
    name: z.string(),
  }),
  spec: z.object({
    subjectRef: z.object({
      userRef: z.object({
        name: z.string(),
      }),
    }),
    approverRef: z
      .object({
        name: z.string(),
      })
      .optional(),
  }),
});

export type UserApprove = z.infer<typeof UserApproveSchema>;

export const UserRejectSchema = z.object({
  apiVersion: z.literal('iam.miloapis.com/v1alpha1'),
  kind: z.literal('PlatformAccessRejection'),
  metadata: z.object({
    name: z.string(),
  }),
  spec: z.object({
    subjectRef: z.object({
      name: z.string(),
    }),
    reason: z.string(),
    rejecterRef: z
      .object({
        name: z.string(),
      })
      .optional(),
  }),
});

export type UserReject = z.infer<typeof UserRejectSchema>;
