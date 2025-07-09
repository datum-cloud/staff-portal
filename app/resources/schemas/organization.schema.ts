import { createProxyResponseSchema } from "./common.schema";
import { z } from "zod";

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
      "kubernetes.io/display-name": z.string(),
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
  kind: z.literal("Organization"),
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
  kind: z.literal("OrganizationList"),
  metadata: OrganizationListMetadataSchema,
});

// Type exports
export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationList = z.infer<typeof OrganizationListSchema>;

export const OrganizationListResponseSchema = createProxyResponseSchema(
  OrganizationListSchema,
);
export type OrganizationListResponse = z.infer<
  typeof OrganizationListResponseSchema
>;

export const OrganizationResponseSchema =
  createProxyResponseSchema(OrganizationSchema);
export type OrganizationResponse = z.infer<typeof OrganizationResponseSchema>;
