import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

// ManagedField schema
const ManagedFieldSchema = z.object({
  apiVersion: z.string(),
  fieldsType: z.string(),
  fieldsV1: z.record(z.any()).optional(),
  manager: z.string(),
  operation: z.string(),
  time: z.string(),
});

// User metadata schema
const UserMetadataSchema = z.object({
  creationTimestamp: z.string(),
  generation: z.number(),
  managedFields: z.array(ManagedFieldSchema).optional(),
  name: z.string(),
  resourceVersion: z.string(),
  uid: z.string(),
});

// User spec schema
const UserSpecSchema = z.object({
  email: z.string().email(),
  familyName: z.string(),
  givenName: z.string(),
});

// Individual User schema
export const UserSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('User'),
  metadata: UserMetadataSchema,
  spec: UserSpecSchema,
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
export type UserList = z.infer<typeof UserListSchema>;

export const UserListResponseSchema = createProxyResponseSchema(UserListSchema);
export type UserListResponse = z.infer<typeof UserListResponseSchema>;

export const UserResponseSchema = createProxyResponseSchema(UserSchema);
export type UserResponse = z.infer<typeof UserResponseSchema>;
