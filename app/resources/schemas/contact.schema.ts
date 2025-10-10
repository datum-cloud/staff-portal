import { createProxyResponseSchema } from './common.schema';
import { z } from 'zod';

export const ContactSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Contact'),
  metadata: z.object({
    annotations: z
      .object({
        'kubectl.kubernetes.io/last-applied-configuration': z.string().optional(),
      })
      .optional(),
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
    email: z.string().email(),
    familyName: z.string(),
    givenName: z.string(),
    subject: z.object({
      apiGroup: z.string(),
      kind: z.string(),
      name: z.string(),
    }),
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
    })
    .optional(),
});

export const ContactListSchema = z.object({
  apiVersion: z.string(),
  items: z.array(ContactSchema),
  kind: z.literal('ContactList'),
  metadata: z.object({
    continue: z.string().optional(),
    resourceVersion: z.string(),
  }),
});

export type Contact = z.infer<typeof ContactSchema>;
export type ContactList = z.infer<typeof ContactListSchema>;

export const ContactListResponseSchema = createProxyResponseSchema(ContactListSchema);
export type ContactListResponse = z.infer<typeof ContactListResponseSchema>;

export const ContactResponseSchema = createProxyResponseSchema(ContactSchema);
export type ContactResponse = z.infer<typeof ContactResponseSchema>;

export const ContactCreateSchema = z.object({
  apiVersion: z.literal('notification.miloapis.com/v1alpha1'),
  kind: z.literal('Contact'),
  metadata: z.object({
    namespace: z.string(),
    name: z.string().optional(),
    generateName: z.string().optional(),
  }),
  spec: z.object({
    familyName: z.string(),
    givenName: z.string(),
    email: z.string().email(),
    subject: z
      .object({
        apiGroup: z.enum(['iam.miloapis.com', 'resourcemanager.miloapis.com']),
        kind: z.enum(['User', 'Organization', 'Project']),
        name: z.string(),
        namespace: z.string().optional(),
      })
      .optional(),
  }),
});

export type ContactCreate = z.infer<typeof ContactCreateSchema>;

export const ContactUpdateSchema = ContactCreateSchema.partial();
export type ContactUpdate = z.infer<typeof ContactUpdateSchema>;
