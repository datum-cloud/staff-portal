import { apiRequest } from '@/modules/axios/axios.server';
import { LokiActivityLogsService, QueryParams } from '@/modules/loki/server';
import { PrometheusService } from '@/modules/prometheus';
import { EnvVariables } from '@/server/iface';
import { logApiError, logApiSuccess } from '@/server/logger';
import { authMiddleware, getToken } from '@/server/middleware';
import { createErrorResponse, createSuccessResponse } from '@/server/response';
import { assistantRoutes } from '@/server/routes/assistant';
import { clusterRoutes } from '@/server/routes/cluster';
import { env } from '@/utils/config/env.server';
import { captureApiError, createRequestLogger } from '@/utils/logger';
import { Hono } from 'hono';

const API_BASENAME = '/api';

// Create an API Hono app
const api = new Hono<{ Variables: EnvVariables }>();

// Helper function to extract request context
const extractRequestContext = (c: any) => ({
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
});

// Helper function to create success response with common headers
const createSuccessResponseWithHeaders = (c: any, reqId: string, data: any, path: string) => {
  return c.json(createSuccessResponse(reqId, data, path), 200, {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });
};

// Public endpoint (no auth required)
api.get('/', async (c) => {
  return c.json({ message: 'Staff API' });
});

// Internal proxy route - catch-all for /api/internal/*
api.all('/internal/*', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const requestContext = extractRequestContext(c);

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

    // Forward the client IP so the API server audit log captures it in sourceIPs.
    const clientIP = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim();
    if (clientIP) {
      headers['X-Forwarded-For'] = clientIP;
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

    // Log success
    logApiSuccess(reqLogger, {
      path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    return createSuccessResponseWithHeaders(c, reqId, response, path);
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

    // Capture server-side API errors to Sentry
    if (error instanceof Error) {
      captureApiError(error, {
        url: path,
        method: c.req.method,
        requestId: reqId,
      });
    }

    if (env.isDebug) {
      reqLogger.debug('Full error details', { error });
    }

    const { response, status } = await createErrorResponse(reqId, error, path);
    return c.json(response, status as any);
  }
});

// Activity API - now handled client-side via CRD API
// This endpoint is kept for backward compatibility but should not be used
api.get('/activity', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const requestContext = extractRequestContext(c);

  reqLogger.info('Activity API Request Started (deprecated)', requestContext);

  try {
    // Return empty response - activity queries should use client-side CRD API
    const response = {
      logs: [],
      query: '',
      timeRange: {
        start: '',
        end: '',
      },
      nextPageToken: undefined,
      hasNextPage: false,
    };

    const duration = Math.round(performance.now() - startTime);

    logApiSuccess(reqLogger, {
      path: c.req.path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    return createSuccessResponseWithHeaders(c, reqId, response, c.req.path);
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    await logApiError(reqLogger, error, {
      path: c.req.path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    if (error instanceof Error) {
      captureApiError(error, {
        url: c.req.path,
        method: c.req.method,
        requestId: reqId,
      });
    }

    const { response, status } = await createErrorResponse(reqId, error, '/activity');
    return c.json(response, status as any);
  }
});

// Metrics API (get data from Prometheus)
api.post('/metrics', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const requestContext = extractRequestContext(c);

  reqLogger.info('Metrics API Request Started', requestContext);

  try {
    const token = getToken(c);
    const body = await c.req.json();
    const { type, ...params } = body;

    if (!type) {
      throw new Error('Query type is required');
    }

    const service = new PrometheusService(token);
    const response = await service.handleAPIRequest({ type, ...params });

    const duration = Math.round(performance.now() - startTime);

    // Log success
    logApiSuccess(reqLogger, {
      path: c.req.path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

    return createSuccessResponseWithHeaders(c, reqId, response, c.req.path);
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

    // Capture server-side API errors to Sentry
    if (error instanceof Error) {
      captureApiError(error, {
        url: c.req.path,
        method: c.req.method,
        requestId: reqId,
      });
    }

    const { response, status } = await createErrorResponse(reqId, error, '/metrics');
    return c.json(response, status as any);
  }
});

api.route('/assistant', assistantRoutes);
api.route('/cluster', clusterRoutes);

export { api, API_BASENAME };
