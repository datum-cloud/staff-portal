import { authenticator } from '@/modules/auth';
import { withRequestContext, getRequestContext } from '@/modules/axios/axios.server';
import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { AppLoadContext } from 'react-router';

/**
 * Hono middleware that automatically sets up request context for the entire request lifecycle.
 * This ensures the request ID from Hono is available in all axios calls, and the bearer token
 * is available to the GraphQL URQL client via AsyncLocalStorage.
 *
 * Note: authMiddleware runs per-route (after this middleware), so c.get('token') is undefined
 * here. We read the session directly from the cookie — the same call authMiddleware makes —
 * so the token is available to server-side GraphQL clients without a proxy round-trip.
 */
export function requestContextMiddleware() {
  return createMiddleware(async (c: Context, next: Next) => {
    const requestId = c.get('requestId');
    const userAgent = c.req.header('User-Agent');

    // Read the session token directly from the cookie (same as authMiddleware does).
    // authMiddleware is per-route and hasn't run yet, so we cannot use c.get('token').
    // NOTE: if authMiddleware ever gains token-refresh logic, this independent read
    // will hold a pre-rotation token — both reads would need to be unified at that point.
    const session = await authenticator.getSession(c.req.raw).catch(() => null);

    return withRequestContext(
      {
        requestId,
        token: session?.accessToken ?? '',
        userId: session?.sub ?? '',
        userAgent,
      },
      async () => {
        await next();
      }
    );
  });
}

/**
 * Alternative: Higher-order function that automatically wraps loader functions with request context
 * Usage: export const loader = withRequestContextWrapper(async ({ params, request, context }) => { ... })
 */
export function withRequestContextWrapper<T extends (...args: any[]) => any>(loader: T): T {
  return ((...args: Parameters<T>) => {
    const loaderArgs = args[0] as { context?: AppLoadContext };
    const requestId = loaderArgs?.context?.requestId;

    if (requestId) {
      // Carry through token/userId/userAgent already set by requestContextMiddleware
      // so server-side GraphQL calls inside the loader are authenticated.
      const existing = getRequestContext() ?? {};
      return withRequestContext({ ...existing, requestId }, () => loader(...args));
    }

    return loader(...args);
  }) as T;
}
