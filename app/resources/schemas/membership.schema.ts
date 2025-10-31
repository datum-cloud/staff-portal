import { createProxyResponseSchema } from '@/resources/schemas';
import z from 'zod';

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
          fieldsV1: z.record(z.string(), z.any()).optional(),
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
export type Member = z.infer<typeof MemberSchema>;

export const MemberListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(MemberSchema),
  kind: z.literal('OrganizationMembershipList'),
  metadata: z.object({
    continue: z.string().optional(),
    resourceVersion: z.string(),
  }),
});
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

export const MemberInvitationSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('UserInvitation'),
  metadata: z.object({
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
    namespace: z.string().optional(),
    resourceVersion: z.string(),
    uid: z.string(),
  }),
  spec: z.object({
    email: z.string(),
    expirationDate: z.string(),
    familyName: z.string().optional(),
    givenName: z.string().optional(),
    invitedBy: z
      .object({
        name: z.string(),
      })
      .optional(),
    organizationRef: z.object({
      name: z.string(),
    }),
    roles: z
      .array(
        z.object({
          name: z.string(),
          namespace: z.string(),
        })
      )
      .optional(),
    state: z.enum(['Pending', 'Accepted', 'Declined']).optional(),
  }),
  status: z
    .object({
      conditions: z
        .array(
          z.object({
            lastTransitionTime: z.string(),
            message: z.string(),
            reason: z.string(),
            status: z.string(),
            type: z.string(),
          })
        )
        .optional(),
      inviterUser: z
        .object({
          displayName: z.string(),
          emailAddress: z.string(),
        })
        .optional(),
      organization: z
        .object({
          displayName: z.string(),
        })
        .optional(),
    })
    .optional(),
});
export type MemberInvitation = z.infer<typeof MemberInvitationSchema>;

export const MemberInvitationListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(MemberInvitationSchema),
  kind: z.literal('UserInvitationList'),
  metadata: z.object({
    continue: z.string().optional(),
    resourceVersion: z.string(),
  }),
});
export type MemberInvitationList = z.infer<typeof MemberInvitationListSchema>;

export const MemberInvitationListResponseSchema = createProxyResponseSchema(
  MemberInvitationListSchema
);
export type MemberInvitationListResponse = z.infer<typeof MemberInvitationListResponseSchema>;

export const MemberInvitationResponseSchema = createProxyResponseSchema(MemberInvitationSchema);
export type MemberInvitationResponse = z.infer<typeof MemberInvitationResponseSchema>;

export const MemberInvitationCreateSchema = z.object({
  apiVersion: z.literal('iam.miloapis.com/v1alpha1'),
  kind: z.literal('UserInvitation'),
  metadata: z.object({
    name: z.string(),
  }),
  spec: z.object({
    familyName: z.string(),
    givenName: z.string(),
    email: z.string(),
    expirationDate: z.string(),
    organizationRef: z.object({ name: z.string() }),
    roles: z.array(z.object({ name: z.string(), namespace: z.string() })).optional(),
    state: z.enum(['Pending', 'Accepted', 'Declined']),
  }),
});
export type MemberInvitationCreate = z.infer<typeof MemberInvitationCreateSchema>;

const TeamMemberSchema = z.object({
  givenName: z.string(),
  familyName: z.string(),
  email: z.string(),
  roles: z.array(z.object({ name: z.string(), namespace: z.string() })).optional(),
  invitationState: z.enum(['Pending', 'Accepted', 'Declined']).optional(),
  type: z.enum(['member', 'invitation']),
  name: z.string(),
  createdAt: z.string().optional(),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const TeamMemberListSchema = z.array(TeamMemberSchema);
export type TeamMemberList = z.infer<typeof TeamMemberListSchema>;

export const TeamMemberListResponseSchema = createProxyResponseSchema(TeamMemberListSchema);
export type TeamMemberListResponse = z.infer<typeof TeamMemberListResponseSchema>;

export const TeamMemberResponseSchema = createProxyResponseSchema(TeamMemberSchema);
export type TeamMemberResponse = z.infer<typeof TeamMemberResponseSchema>;
