import { PrometheusService } from '@/modules/prometheus';
import { EnvVariables } from '@/server/iface';
import { logApiError, logApiSuccess } from '@/server/logger';
import { authMiddleware, getToken } from '@/server/middleware';
import {
  createErrorResponse,
  createSuccessResponseWithHeaders,
  extractRequestContext,
} from '@/server/response';
import { captureApiError, createRequestLogger } from '@/utils/logger';
import { Hono } from 'hono';

/** Prometheus/metrics proxy — POST `/api/metrics` with `{ type, ...params }`. */
export const metricsRoutes = new Hono<{ Variables: EnvVariables }>();

metricsRoutes.post('/', authMiddleware(), async (c) => {
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

    const { response, status } = await createErrorResponse(reqId, error, '/metrics');
    return c.json(response, status as any);
  }
});
