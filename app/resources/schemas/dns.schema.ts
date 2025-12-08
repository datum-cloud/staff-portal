import { ExtendedControlPlaneStatusSchema } from './control-plane.schema';
import { z } from 'zod';

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
