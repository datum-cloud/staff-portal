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
          fieldsV1: z.record(z.any()).optional(),
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

export const MemberSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('OrganizationMembership'),
  metadata: z.object({
    creationTimestamp: z.string(),
    generation: z.number(),
    managedFields: z
      .array(
        z.object({
          apiVersion: z.string(),
          fieldsType: z.string(),
          fieldsV1: z.record(z.any()).optional(),
          manager: z.string(),
          operation: z.string(),
          time: z.string(),
        })
      )
      .optional(),
    name: z.string(),
    resourceVersion: z.string(),
    uid: z.string(),
  }),
  spec: z.object({
    organizationRef: z.object({
      name: z.string(),
    }),
    userRef: z.object({
      name: z.string(),
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
    })
    .optional(),
});

export const MemberListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(MemberSchema),
  kind: z.literal('OrganizationMembershipList'),
  metadata: z.object({
    continue: z.string().optional(),
    resourceVersion: z.string(),
  }),
});

export type Member = z.infer<typeof MemberSchema>;
export type MemberList = z.infer<typeof MemberListSchema>;

export const MemberListResponseSchema = createProxyResponseSchema(MemberListSchema);
export type MemberListResponse = z.infer<typeof MemberListResponseSchema>;

export const MemberResponseSchema = createProxyResponseSchema(MemberSchema);
export type MemberResponse = z.infer<typeof MemberResponseSchema>;

export const MembershipFiltersSchema = z.object({
  fieldSelector: z.string().optional(),
  labelSelector: z.string().optional(),
  organizationRef: z.string().optional(),
  userRef: z.string().optional(),
});

export type MembershipFilters = z.infer<typeof MembershipFiltersSchema>;
