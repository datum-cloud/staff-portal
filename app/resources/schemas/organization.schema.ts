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

// OwnerReference schema
const OwnerReferenceSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  name: z.string(),
  uid: z.string(),
});

// Organization metadata schema
const OrganizationMetadataSchema = z.object({
  annotations: z
    .object({
      'kubernetes.io/display-name': z.string(),
    })
    .optional(),
  creationTimestamp: z.string(),
  generation: z.number(),
  managedFields: z.array(ManagedFieldSchema).optional(),
  name: z.string(),
  ownerReferences: z.array(OwnerReferenceSchema).optional(),
  resourceVersion: z.string(),
  uid: z.string(),
});

// Organization spec schema
const OrganizationSpecSchema = z.object({
  type: z.string(),
});

// Individual Organization schema
export const OrganizationSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Organization'),
  metadata: OrganizationMetadataSchema,
  spec: OrganizationSpecSchema,
});

// OrganizationList metadata schema
const OrganizationListMetadataSchema = z.object({
  continue: z.string(),
  resourceVersion: z.string(),
});

// OrganizationList schema
export const OrganizationListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(OrganizationSchema),
  kind: z.literal('OrganizationList'),
  metadata: OrganizationListMetadataSchema,
});

// Type exports
export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationList = z.infer<typeof OrganizationListSchema>;

export const OrganizationListResponseSchema = createProxyResponseSchema(OrganizationListSchema);
export type OrganizationListResponse = z.infer<typeof OrganizationListResponseSchema>;

export const OrganizationResponseSchema = createProxyResponseSchema(OrganizationSchema);
export type OrganizationResponse = z.infer<typeof OrganizationResponseSchema>;

// Member metadata schema
const MemberMetadataSchema = z.object({
  creationTimestamp: z.string(),
  generation: z.number(),
  managedFields: z.array(ManagedFieldSchema).optional(),
  name: z.string(),
  resourceVersion: z.string(),
  uid: z.string(),
});

// Member spec schema
const MemberSpecSchema = z.object({
  organizationRef: z.object({
    name: z.string(),
  }),
  userRef: z.object({
    name: z.string(),
  }),
});

// Member status schema
const MemberStatusSchema = z.object({
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
  organization: z
    .object({
      displayName: z.string(),
      type: z.string(),
    })
    .optional(),
  user: z
    .object({
      email: z.string(),
      familyName: z.string(),
      givenName: z.string(),
    })
    .optional(),
});

// Individual Member schema
export const MemberSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('OrganizationMembership'),
  metadata: MemberMetadataSchema,
  spec: MemberSpecSchema,
  status: MemberStatusSchema.optional(),
});

// MemberList metadata schema
const MemberListMetadataSchema = z.object({
  continue: z.string().optional(),
  resourceVersion: z.string(),
});

// MemberList schema
export const MemberListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(MemberSchema),
  kind: z.literal('OrganizationMembershipList'),
  metadata: MemberListMetadataSchema,
});

// Type exports for members
export type Member = z.infer<typeof MemberSchema>;
export type MemberList = z.infer<typeof MemberListSchema>;

export const MemberListResponseSchema = createProxyResponseSchema(MemberListSchema);
export type MemberListResponse = z.infer<typeof MemberListResponseSchema>;

export const MemberResponseSchema = createProxyResponseSchema(MemberSchema);
export type MemberResponse = z.infer<typeof MemberResponseSchema>;

// Membership filter schema for type-safe filtering
export const MembershipFiltersSchema = z.object({
  fieldSelector: z.string().optional(),
  labelSelector: z.string().optional(),
  organizationRef: z.string().optional(),
  userRef: z.string().optional(),
});

export type MembershipFilters = z.infer<typeof MembershipFiltersSchema>;
