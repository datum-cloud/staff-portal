import { authenticator } from '@/modules/auth';
import { EnvVariables } from '@/server/iface';
import { logApiError } from '@/server/logger';
import { createErrorResponse } from '@/server/response';
import { AuthenticationError } from '@/utils/errors';
import { createRequestLogger } from '@/utils/logger';
import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

/**
 * Hono middleware for authentication
 * Validates user authentication and sets access token in context
 */
export function authMiddleware() {
  return createMiddleware(async (c: Context<{ Variables: EnvVariables }>, next: Next) => {
    const startTime = performance.now();
    const reqLogger = createRequestLogger(c);
    const reqId = c.get('requestId');

    // Get cookies from the request
    const cookieHeader = c.req.header('Cookie');

    // Create a Request object from Hono context to use with existing auth utilities
    const request = new Request(c.req.url, {
      method: c.req.method,
      headers: {
        Cookie: cookieHeader || '',
        ...c.req.header(),
      },
    });

    try {
      // Check if user is authenticated
      const isAuthenticated = await authenticator.isAuthenticated(request);
      if (!isAuthenticated) {
        throw new AuthenticationError('Authentication required', reqId);
      }

      // Get the session with access token
      const session = await authenticator.getSession(request);
      if (!session?.accessToken) {
        throw new AuthenticationError('No access token available', reqId);
      }

      // Set access token in context using proper Hono way
      c.set('token', session.accessToken);

      await next();
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);

      // Use typed error logging
      await logApiError(reqLogger, error, {
        path: c.req.path,
        method: c.req.method,
        duration,
        userAgent: c.req.header('User-Agent'),
        ip:
          c.req.header('x-forwarded-for') ||
          c.req.header('x-real-ip') ||
          c.req.header('x-client-ip') ||
          c.req.header('cf-connecting-ip') ||
          c.req.header('x-forwarded') ||
          'unknown',
      });

      // Handle any authentication errors or unexpected errors
      const { response, status } = await createErrorResponse(reqId, error, c.req.path);
      return c.json(response, status as any);
    }
  });
}

// Helper function to safely get token from context
export const getToken = (c: Context<{ Variables: EnvVariables }>) => {
  return c.get('token') as string;
};
