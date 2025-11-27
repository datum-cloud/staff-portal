import { createProxyResponseSchema } from './common.schema';
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
