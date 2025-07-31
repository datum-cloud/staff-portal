/**
 * Type definitions for Loki integration
 */
import { z } from 'zod';

// Zod schemas
export const LokiConfigSchema = z.object({
  remoteApiURL: z.string(),
  defaultLimit: z.number(),
  maxLimit: z.number(),
  defaultTimeRange: z.string(),
});

// Enhanced query parameters supporting single resource and advanced filtering
export const QueryParamsSchema = z.object({
  limit: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  project: z.string().optional(), // Legacy project filter
  orgName: z.string().optional(), // Organization filter
  // Enhanced filtering options
  q: z.string().optional(), // Flexible search across multiple fields (user, resource, action, etc.)
  user: z.string().optional(), // Specific user filter
  status: z.string().optional(), // Status filter (success, error, or specific codes like 403)
  /**
   * Action filter
   * get - Read a specific resource
   * list - List a collection of resources
   * watch - Watch for changes
   * create - Submit new resources
   * update - Modify existing resources
   * patch - Partially update resources
   * delete - Remove a resource
   * deletecollection - Remove multiple resources
   * proxy - Proxy access through Kubernetes API server
   * * - Wildcard to match all verbs
   */
  actions: z.string().optional(), // Comma-separated list of verbs to filter (e.g., "create,update,delete")
  // Single resource support
  resourceType: z.string().optional(), // Resource type filter
  resourceId: z.string().optional(), // Resource ID filter
  // Advanced filtering
  responseCode: z.string().optional(), // Specific HTTP response code
  apiGroup: z.string().optional(), // Specific API group filter
  namespace: z.string().optional(), // Specific namespace filter
  sourceIP: z.string().optional(), // Source IP filter
});

export const ValidatedQueryParamsSchema = z.object({
  limit: z.number(),
  start: z.string(),
  end: z.string(),
});

export const LokiQueryResponseSchema = z.object({
  logs: z.array(z.string()),
  timerange: z.tuple([z.number(), z.number()]),
});

export const ActivityLogEntrySchema = z.object({
  timestamp: z.string(),
  message: z.string(),
  formattedMessage: z.string().optional(), // HTML formatted message with class names
  statusMessage: z.string().optional(), // Status code and description
  level: z.string(),
  labels: z.record(z.string(), z.string()).optional(),
  raw: z.string().optional(),
  // Kubernetes audit log specific fields
  auditId: z.string().optional(),
  user: z
    .object({
      username: z.string(),
      uid: z.string(),
      groups: z.array(z.string()),
    })
    .optional(),
  verb: z.string().optional(),
  resource: z
    .object({
      apiGroup: z.string().optional(),
      apiVersion: z.string().optional(),
      resource: z.string().optional(),
      namespace: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  requestUri: z.string().optional(),
  responseStatus: z
    .object({
      code: z.number(),
      message: z.string().optional(),
      reason: z.string().optional(),
    })
    .optional(),
  sourceIPs: z.array(z.string()).optional(),
  userAgent: z.string().optional(),
  stage: z.string().optional(),
  annotations: z.record(z.string(), z.string()).optional(),
  // UI enhancement fields
  category: z.enum(['success', 'error', 'warning', 'info']).optional(),
  icon: z.string().optional(),
});

export const ActivityLogsResponseSchema = z.object({
  logs: z.array(ActivityLogEntrySchema),
  query: z.string(),
  timeRange: z.object({
    start: z.string(), // ISO date string
    end: z.string(), // ISO date string
  }),
});

// Enhanced LogQL query options supporting single resource and advanced patterns
export const LogQLQueryOptionsSchema = z.object({
  baseSelector: z.string(),
  projectName: z.string().optional(),
  orgName: z.string().optional(), // Organization filter
  // Enhanced filtering approach
  q: z.string().optional(), // Flexible search across multiple fields
  user: z.string().optional(), // Specific user filter
  action: z.string().optional(), // Specific action filter (legacy)
  status: z.string().optional(), // Status filter (success, error, or specific codes)
  actions: z.string().optional(), // Comma-separated list of verbs to filter (e.g., "create,update,delete")
  // Single resource support
  resourceType: z.string().optional(), // Resource type filter
  resourceId: z.string().optional(), // Resource ID filter
  // Advanced filtering options
  responseCode: z.string().optional(), // Specific HTTP response code
  apiGroup: z.string().optional(), // Specific API group filter
  namespace: z.string().optional(), // Specific namespace filter
  sourceIP: z.string().optional(), // Source IP filter
});

export const FormatAuditMessageOptionsSchema = z.object({
  truncate: z.boolean().optional(),
  maxLength: z.number().optional(),
  truncateSuffix: z.string().optional(),
});

export const ActivityCategorySchema = z.object({
  category: z.enum(['success', 'error', 'warning', 'info']),
  icon: z.string(),
});

export const ParsedLogLineSchema = z.object({
  message: z.string(),
  level: z.string(),
  parsed: z.any(),
});

// Inferred types from Zod schemas
export type LokiConfig = z.infer<typeof LokiConfigSchema>;
export type QueryParams = z.infer<typeof QueryParamsSchema>;
export type ValidatedQueryParams = z.infer<typeof ValidatedQueryParamsSchema>;
export type LokiQueryResponse = z.infer<typeof LokiQueryResponseSchema>;
export type ActivityLogEntry = z.infer<typeof ActivityLogEntrySchema>;
export type ActivityLogsResponse = z.infer<typeof ActivityLogsResponseSchema>;
export type LogQLQueryOptions = z.infer<typeof LogQLQueryOptionsSchema>;
export type FormatAuditMessageOptions = z.infer<typeof FormatAuditMessageOptionsSchema>;
export type ActivityCategory = z.infer<typeof ActivityCategorySchema>;
export type ParsedLogLine = z.infer<typeof ParsedLogLineSchema>;
