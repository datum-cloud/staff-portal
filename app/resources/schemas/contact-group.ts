import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const ContactGroupSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('ContactGroup'),
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
    displayName: z.string(),
    visibility: z.enum(['public', 'private']).optional(),
  }),
  status: z
    .object({
      conditions: z.array(
        z.object({
          lastTransitionTime: z.string(),
          message: z.string(),
          observedGeneration: z.number().optional(),
          reason: z.string(),
          status: z.string(),
          type: z.string(),
        })
      ),
      providerID: z.string().optional(),
    })
    .optional(),
});

export const ContactGroupListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(ContactGroupSchema),
  kind: z.literal('ContactGroupList'),
  metadata: z.object({
    continue: z.string().optional(),
    resourceVersion: z.string(),
  }),
});

export type ContactGroup = z.infer<typeof ContactGroupSchema>;
export type ContactGroupList = z.infer<typeof ContactGroupListSchema>;

export const ContactGroupListResponseSchema = createProxyResponseSchema(ContactGroupListSchema);
export type ContactGroupListResponse = z.infer<typeof ContactGroupListResponseSchema>;

export const ContactGroupResponseSchema = createProxyResponseSchema(ContactGroupSchema);
export type ContactGroupResponse = z.infer<typeof ContactGroupResponseSchema>;

export const ContactGroupCreateSchema = z.object({
  apiVersion: z.literal('notification.miloapis.com/v1alpha1'),
  kind: z.literal('ContactGroup'),
  metadata: z.object({
    namespace: z.string(),
    name: z.string().optional(),
    generateName: z.string().optional(),
  }),
  spec: z.object({
    displayName: z.string(),
    visibility: z.enum(['public', 'private']).optional(),
  }),
});

export type ContactGroupCreate = z.infer<typeof ContactGroupCreateSchema>;

export const ContactGroupUpdateSchema = ContactGroupCreateSchema.partial();
export type ContactGroupUpdate = z.infer<typeof ContactGroupUpdateSchema>;

export const ContactGroupMembershipSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('ContactGroupMembership'),
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
    contactRef: z.object({
      name: z.string(),
      namespace: z.string(),
    }),
    contactGroupRef: z.object({
      name: z.string(),
      namespace: z.string(),
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
      providerID: z.string().optional(),
    })
    .optional(),
});

export const ContactGroupMembershipListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(ContactGroupMembershipSchema),
  kind: z.literal('ContactGroupMembershipList'),
  metadata: z.object({
    continue: z.string().optional(),
    resourceVersion: z.string(),
  }),
});

export const ContactGroupMembershipResponseSchema = createProxyResponseSchema(
  ContactGroupMembershipSchema
);
export const ContactGroupMembershipListResponseSchema = createProxyResponseSchema(
  ContactGroupMembershipListSchema
);

export type ContactGroupMembership = z.infer<typeof ContactGroupMembershipSchema>;
export type ContactGroupMembershipList = z.infer<typeof ContactGroupMembershipListSchema>;
export type ContactGroupMembershipResponse = z.infer<typeof ContactGroupMembershipResponseSchema>;
export type ContactGroupMembershipListResponse = z.infer<
  typeof ContactGroupMembershipListResponseSchema
>;

export const ContactGroupMembershipCreateSchema = z.object({
  apiVersion: z.literal('notification.miloapis.com/v1alpha1'),
  kind: z.literal('ContactGroupMembership'),
  metadata: z.object({
    namespace: z.string(),
    name: z.string().optional(),
    generateName: z.string().optional(),
  }),
  spec: z.object({
    contactRef: z.object({
      name: z.string(),
      namespace: z.string(),
    }),
    contactGroupRef: z.object({
      name: z.string(),
      namespace: z.string(),
    }),
  }),
});

export type ContactGroupMembershipCreate = z.infer<typeof ContactGroupMembershipCreateSchema>;
