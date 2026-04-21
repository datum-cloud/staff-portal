import { createProxyResponseSchema } from './common.schema';
import type { IoK8sApiserverPkgApisAuditV1Event } from '@openapi/activity.miloapis.com/v1alpha1';
import { z } from 'zod';

// Activity-specific query parameters
export const ActivityQueryParamsSchema = z.object({
  start: z.union([z.number(), z.string()]).optional(),
  end: z.union([z.number(), z.string()]).optional(),
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
  resourceName: z.string().optional(), // Filter by specific resource name
});

export const ActivityLogsResponseSchema = z.object({
  logs: z.array(z.any()), // Using z.any() since we're using OpenAPI types directly
  query: z.string(),
  timeRange: z.object({
    start: z.string(), // ISO date string
    end: z.string(), // ISO date string
  }),
  nextPageToken: z.string().optional(),
  hasNextPage: z.boolean().optional(),
});

export const ActivityListResponseSchema = createProxyResponseSchema(ActivityLogsResponseSchema);

export type ActivityListResponse = z.infer<typeof ActivityListResponseSchema>;
export type ActivityQueryParams = z.infer<typeof ActivityQueryParamsSchema>;
export type ActivityLogEntry = IoK8sApiserverPkgApisAuditV1Event;
