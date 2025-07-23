import { withRequestContext } from '@/modules/axios/axios.server';
import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { AppLoadContext } from 'react-router';

/**
 * Hono middleware that automatically sets up request context for the entire request lifecycle
 * This ensures the request ID from Hono is available in all axios calls
 */
export function requestContextMiddleware() {
  return createMiddleware(async (c: Context, next: Next) => {
    const requestId = c.get('requestId');

    if (requestId) {
      // Set up the request context for this entire request
      return withRequestContext(requestId, async () => {
        await next();
      });
    } else {
      // If no request ID, just continue normally
      await next();
    }
  });
}

/**
 * Alternative: Higher-order function that automatically wraps loader functions with request context
 * Usage: export const loader = withRequestContextWrapper(async ({ params, request, context }) => { ... })
 */
export function withRequestContextWrapper<T extends (...args: any[]) => any>(loader: T): T {
  return ((...args: Parameters<T>) => {
    // Extract context from the first argument (assuming it's a loader args object)
    const loaderArgs = args[0] as { context?: AppLoadContext };
    const requestId = loaderArgs?.context?.requestId;

    if (requestId) {
      return withRequestContext(requestId, () => loader(...args));
    }

    // If no request ID, just call the original loader
    return loader(...args);
  }) as T;
}
