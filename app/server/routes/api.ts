import { apiRequest } from '@/modules/axios/axios.server';
import { LokiActivityLogsService, QueryParams } from '@/modules/loki/server';
import { EnvVariables } from '@/server/iface';
import { logApiError, logApiSuccess } from '@/server/logger';
import { authMiddleware, getToken } from '@/server/middleware';
import { createErrorResponse, createSuccessResponse } from '@/server/response';
import { env } from '@/utils/config/env.server';
import { createRequestLogger } from '@/utils/logger';
import { Hono } from 'hono';

const API_BASENAME = '/api';

// Create an API Hono app
const api = new Hono<{ Variables: EnvVariables }>();

// Public endpoint (no auth required)
api.get('/', async (c) => {
  return c.json({ message: 'Staff API' });
});

// Internal proxy route - catch-all for /api/internal/*
api.all('/internal/*', authMiddleware(), async (c) => {
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

  const path = c.req.path.replace(/^\/api\/internal/, '').replace(/^\//, '');

  try {
    // Get query parameters
    const searchParams = c.req.query();
    const queryString = new URLSearchParams(searchParams).toString();
    const fullTargetUrl = queryString ? `${path}?${queryString}` : path;
    const token = getToken(c);

    // Prepare headers for the proxy request
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
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

// Activity API (get data from telemetry - loki)
api.get('/activity', authMiddleware(), async (c) => {
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

  reqLogger.info('Activity API Request Started', requestContext);

  try {
    const token = getToken(c);
    const queryParams: QueryParams = {
      limit: c.req.query('limit') || undefined,
      start: c.req.query('start') || undefined,
      end: c.req.query('end') || undefined,
      project: c.req.query('project') || undefined,
      // Hybrid filtering approach
      q: c.req.query('q') || undefined,
      user: c.req.query('user') || undefined,
      actions: c.req.query('actions') || undefined,
      resource: c.req.query('resource') || undefined,
      status: c.req.query('status') || undefined,
    };

    const service = new LokiActivityLogsService(token);
    const response = await service.getActivityLogs(queryParams);

    const duration = Math.round(performance.now() - startTime);

    // Log success with response size estimation
    logApiSuccess(reqLogger, {
      path: c.req.path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    // Return the response with appropriate headers
    return c.json(createSuccessResponse(reqId, response, c.req.path), 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    // Use typed error logging
    await logApiError(reqLogger, error, {
      path: c.req.path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    const { response, status } = await createErrorResponse(reqId, error, '/activity');
    return c.json(response, status as any);
  }
});

export { api, API_BASENAME };
