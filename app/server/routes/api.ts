import { authenticator } from '@/modules/auth';
import { apiRequest } from '@/modules/axios/axios.server';
import { EnvVariables } from '@/server/iface';
import { logApiError, logApiSuccess } from '@/server/logger';
import { createErrorResponse, createSuccessResponse } from '@/server/response';
import { env } from '@/utils/config/env.server';
import { AuthenticationError, ConflictError } from '@/utils/errors';
import { createRequestLogger } from '@/utils/logger';
import { Hono } from 'hono';

const API_BASENAME = '/api';

// Create an API Hono app
const api = new Hono<{ Variables: EnvVariables }>();

api.get('/', async (c) => {
  return c.json({ message: 'Staff API' });
});

// Internal proxy route - catch-all for /api/internal/*
api.all('/internal/*', async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');

  // Extract request context for logging
  const requestContext = {
    path: c.req.path,
    method: c.req.method,
    url: c.req.url,
    userAgent: c.req.header('User-Agent'),
    ip:
      c.req.header('x-forwarded-for') ||
      c.req.header('x-real-ip') ||
      c.req.header('x-client-ip') ||
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded') ||
      'unknown',
  };

  reqLogger.info('API Request Started', requestContext);

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

  const path = c.req.path.replace(/^\/api\/internal/, '').replace(/^\//, '');

  try {
    // Check if user is authenticated
    const isAuthenticated = await authenticator.isAuthenticated(request);
    if (!isAuthenticated) {
      throw new AuthenticationError('Authentication required');
    }

    // Get the session with access token
    const session = await authenticator.getSession(request);
    if (!session?.accessToken) {
      throw new AuthenticationError('No access token available');
    }

    // Get query parameters
    const searchParams = c.req.query();
    const queryString = new URLSearchParams(searchParams).toString();
    const fullTargetUrl = queryString ? `${path}?${queryString}` : path;

    // Prepare headers for the proxy request
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.accessToken}`,
    };

    // Forward content type if present
    const contentType = c.req.header('Content-Type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    // Forward accept header if present
    const accept = c.req.header('Accept');
    if (accept) {
      headers['Accept'] = accept;
    }

    // Forward user agent if present
    const userAgent = c.req.header('User-Agent');
    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }

    // Prepare request body for non-GET requests
    let requestBody: string | undefined;
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      requestBody = await c.req.text();
    }

    // Forward the request to the actual API
    const response = await apiRequest({
      method: c.req.method,
      url: fullTargetUrl,
      headers,
      ...(requestBody && { data: requestBody }),
    }).execute();

    const duration = Math.round(performance.now() - startTime);

    // Log success with response size estimation
    const responseSize =
      typeof response === 'string'
        ? response.length
        : response
          ? JSON.stringify(response).length
          : 0;

    logApiSuccess(reqLogger, {
      path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
      responseSize,
    });

    // Return the response with appropriate headers
    return c.json(createSuccessResponse(reqId, response, path), 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    // Use typed error logging
    await logApiError(reqLogger, error, {
      path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    if (env.isDebug) {
      reqLogger.debug('Full error details', { error });
    }

    // Create error response using the extracted function
    const { response, status } = await createErrorResponse(reqId, error, path);
    return c.json(response, status as any);
  }
});

export { api, API_BASENAME };
