import { z } from 'zod';

// Generic wrapper schema that can accept any data type
export const createProxyResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    code: z.string(),
    data: dataSchema,
    path: z.string(),
  });

// Type helper for the wrapped response
export type ProxyResponse<T> = {
  code: string;
  data: T;
  path: string;
};

// Example usage with a specific data schema
export const ProxyRequestSuccessSchema = createProxyResponseSchema(z.any());

// Type for the example schema
export type ProxyRequestSuccess = z.infer<typeof ProxyRequestSuccessSchema>;

// Generic ListQueryParams type that supports type-safe filters
export type ListQueryParams<T = Record<string, any>> = {
  limit?: number;
  cursor?: string;
  filters?: T;
  search?: string;
};

/**
 * Usage examples:
 *
 * // Generic usage (backward compatible)
 * ListQueryParams
 *
 * // Type-safe membership filters
 * ListQueryParams<MembershipFilters>
 *
 * // Type-safe activity filters
 * ListQueryParams<ActivityQueryParams>
 *
 * // Custom filter types
 * ListQueryParams<{ status: string; category: string }>
 */
// Schema for backward compatibility (when no specific filter type is needed)
export const ListQueryParamsSchema = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  /**
   * Generic filters object that can contain any filter values.
   *
   * Common patterns:
   * - Date filters: { start: number, end: number }
   * - Resource filters: { project: string, organization: string, user: string }
   * - Kubernetes-style field selectors: { fieldSelector: 'spec.role=admin,spec.userRef.name=john' }
   * - Label selectors: { labelSelector: 'app=frontend,env=prod' }
   */
  filters: z.record(z.any()).optional(),
  search: z.string().optional(),
});
