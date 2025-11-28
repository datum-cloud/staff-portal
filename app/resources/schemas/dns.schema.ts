import { createProxyResponseSchema } from './common.schema';
import { ExtendedControlPlaneStatusSchema } from './control-plane.schema';
import { a } from 'vitest/dist/chunks/suite.d.FvehnV49.js';
import { z } from 'zod';

const ManagedFieldSchema = z.object({
  apiVersion: z.string(),
  fieldsType: z.string(),
  fieldsV1: z.record(z.string(), z.any()).optional(),
  manager: z.string(),
  operation: z.string(),
  subresource: z.string().optional(),
  time: z.string(),
});

const DNSZoneConditionSchema = z.object({
  lastTransitionTime: z.string(),
  message: z.string(),
  observedGeneration: z.number(),
  reason: z.string(),
  status: z.string(),
  type: z.string(),
});

const DNSZoneDomainRefNameserverIpSchema = z.object({
  address: z.string(),
  registrantName: z.string(),
});

const DNSZoneDomainRefNameserverSchema = z.object({
  hostname: z.string(),
  ips: z.array(DNSZoneDomainRefNameserverIpSchema),
});

export type DNSZoneDomainRefNameserver = z.infer<typeof DNSZoneDomainRefNameserverSchema>;

const DNSZoneDomainRefStatusSchema = z.object({
  nameservers: z.array(DNSZoneDomainRefNameserverSchema),
});

const DNSZoneDomainRefSchema = z.object({
  name: z.string(),
  status: DNSZoneDomainRefStatusSchema,
});

export const DNSZoneSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('DNSZone'),
  metadata: z.object({
    annotations: z.record(z.string(), z.string()).optional(),
    creationTimestamp: z.string(),
    finalizers: z.array(z.string()).optional(),
    generation: z.number(),
    managedFields: z.array(ManagedFieldSchema).optional(),
    name: z.string(),
    namespace: z.string(),
    resourceVersion: z.string(),
    uid: z.string(),
  }),
  spec: z.object({
    dnsZoneClassName: z.string(),
    domainName: z.string(),
  }),
  status: z.object({
    conditions: z.array(DNSZoneConditionSchema),
    domainRef: DNSZoneDomainRefSchema,
    nameservers: z.array(z.string()),
    recordCount: z.number(),
  }),
});

export const DNSZoneListSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('DNSZoneList'),
  metadata: z.object({
    continue: z.string(),
    resourceVersion: z.string(),
  }),
  items: z.array(DNSZoneSchema),
});

export type DNSZone = z.infer<typeof DNSZoneSchema>;
export type DNSZoneList = z.infer<typeof DNSZoneListSchema>;

export const DNSZoneResponseSchema = createProxyResponseSchema(DNSZoneSchema);
export type DNSZoneResponse = z.infer<typeof DNSZoneResponseSchema>;

export const DNSZoneListResponseSchema = createProxyResponseSchema(DNSZoneListSchema);
export type DNSZoneListResponse = z.infer<typeof DNSZoneListResponseSchema>;

const DNSRecordConditionSchema = z.object({
  lastTransitionTime: z.string(),
  message: z.string(),
  observedGeneration: z.number(),
  reason: z.string(),
  status: z.string(),
  type: z.string(),
});

const DNSRecordOwnerReferenceSchema = z.object({
  apiVersion: z.string(),
  blockOwnerDeletion: z.boolean(),
  controller: z.boolean(),
  kind: z.string(),
  name: z.string(),
  uid: z.string(),
});

const DNSRecordARecordSchema = z.object({
  content: z.string(),
});

const DNSRecordTXTRecordSchema = z.object({
  content: z.string(),
});

const DNSRecordMXRecordSchema = z.object({
  exchange: z.string(),
  preference: z.number(),
});

const DNSRecordRecordSchema = z.object({
  name: z.string(),
  ttl: z.number(),
  a: DNSRecordARecordSchema.optional(),
  txt: DNSRecordTXTRecordSchema.optional(),
  mx: DNSRecordMXRecordSchema.optional(),
});

const DNSRecordDnsZoneRefSchema = z.object({
  name: z.string(),
});

export const DNSRecordSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('DNSRecordSet'),
  metadata: z.object({
    annotations: z.record(z.string(), z.string()).optional(),
    creationTimestamp: z.string(),
    finalizers: z.array(z.string()).optional(),
    generation: z.number(),
    managedFields: z.array(ManagedFieldSchema).optional(),
    name: z.string(),
    namespace: z.string(),
    ownerReferences: z.array(DNSRecordOwnerReferenceSchema).optional(),
    resourceVersion: z.string(),
    uid: z.string(),
  }),
  spec: z.object({
    dnsZoneRef: DNSRecordDnsZoneRefSchema,
    recordType: z.string(),
    records: z.array(DNSRecordRecordSchema),
  }),
  status: z.object({
    conditions: z.array(DNSRecordConditionSchema),
  }),
});

export const DNSRecordListSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('DNSRecordSetList'),
  metadata: z.object({
    continue: z.string(),
    resourceVersion: z.string(),
  }),
  items: z.array(DNSRecordSchema),
});

export type DNSRecord = z.infer<typeof DNSRecordSchema>;
export type DNSRecordList = z.infer<typeof DNSRecordListSchema>;

export const DNSRecordResponseSchema = createProxyResponseSchema(DNSRecordSchema);
export type DNSRecordResponse = z.infer<typeof DNSRecordResponseSchema>;

export const DNSRecordListResponseSchema = createProxyResponseSchema(DNSRecordListSchema);
export type DNSRecordListResponse = z.infer<typeof DNSRecordListResponseSchema>;

export const DNSRecordFlattenedSchema = z.object({
  recordSetId: z.string().optional(),
  recordSetName: z.string().optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
  dnsZoneId: z.string(),
  type: z.string(),
  name: z.string(),
  value: z.string(),
  ttl: z.number().optional(),
  status: ExtendedControlPlaneStatusSchema.optional(),
  rawData: z.any(),
});

export type DNSRecordFlattened = z.infer<typeof DNSRecordFlattenedSchema>;

export const DNSRecordFlattenedListSchema = z.array(DNSRecordFlattenedSchema);
export type DNSRecordFlattenedList = z.infer<typeof DNSRecordFlattenedListSchema>;

export const DNSRecordFlattenedListResponseSchema = createProxyResponseSchema(
  DNSRecordFlattenedListSchema
);
export type DNSRecordFlattenedListResponse = z.infer<typeof DNSRecordFlattenedListResponseSchema>;
