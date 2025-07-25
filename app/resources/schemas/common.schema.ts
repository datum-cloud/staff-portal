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

export const ListQueryParamsSchema = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  filters: z.record(z.any()).optional(),
  search: z.string().optional(),
});
export type ListQueryParams = z.infer<typeof ListQueryParamsSchema>;
