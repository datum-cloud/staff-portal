import { createProxyResponseSchema } from './common.schema';
import { ActivityLogsResponseSchema } from '@/modules/loki';
import { z } from 'zod';

// Activity-specific query parameters
export const ActivityQueryParamsSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  user: z.string().optional(),
  resourceType: z.string().optional(), // Resource type filter
  resourceId: z.string().optional(), // Resource ID filter
  status: z.string().optional(),
  actions: z.string().optional(),
  responseCode: z.string().optional(),
  apiGroup: z.string().optional(),
  namespace: z.string().optional(),
  sourceIP: z.string().optional(),
  project: z.string().optional(),
  organization: z.string().optional(),
});

export const ActivityListResponseSchema = createProxyResponseSchema(ActivityLogsResponseSchema);

export type ActivityListResponse = z.infer<typeof ActivityListResponseSchema>;
export type ActivityQueryParams = z.infer<typeof ActivityQueryParamsSchema>;
