import { logger } from '@/utils/logger';
import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

/**
 * Hono middleware for request logging
 * Logs incoming requests and outgoing responses with timing information
 */
export function loggerMiddleware() {
  return createMiddleware(async (c: Context, next: Next) => {
    const startTime = performance.now();
    const requestId = c.get('requestId');
    const path = c.req.path;

    // Skip logging for health check endpoints
    if (path === '/_healthz' || path === '/_readyz' || path === '/metrics') {
      return next();
    }

    // Log request start
    logger.httpRequest(requestId, c.req.method, c.req.path, c.req.header());

    await next();

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    // Log request completion
    logger.httpResponse(
      requestId,
      c.res.status,
      responseTime,
      Object.fromEntries(c.res.headers.entries())
    );

    // Log errors if any
    if (c.error) {
      logger.error('Request failed', {
        reqId: requestId,
        error: {
          message: c.error.message,
          stack: c.error.stack,
        },
      });
    }
  });
}

/**
 * Alternative logger middleware that uses Hono's built-in logger format
 * but with our custom logger implementation
 */
export function honoLoggerMiddleware() {
  return createMiddleware(async (c: Context, next: Next) => {
    const startTime = Date.now();
    const requestId = c.get('requestId');

    // Log request start
    logger.info(`${c.req.method} ${c.req.url}`, {
      reqId: requestId,
      method: c.req.method,
      url: c.req.url,
      userAgent: c.req.header('user-agent'),
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    });

    try {
      await next();
    } catch (error) {
      // Log any errors that occur during request processing
      logger.error('Request processing error', {
        reqId: requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Log response completion
    logger.info(`${c.req.method} ${c.req.url} - ${c.res.status}`, {
      reqId: requestId,
      status: c.res.status,
      responseTime: `${responseTime}ms`,
      contentLength: c.res.headers.get('content-length'),
    });
  });
}

/**
 * Simple logger middleware that just logs basic request/response info
 */
export function simpleLoggerMiddleware() {
  return createMiddleware(async (c: Context, next: Next) => {
    const startTime = Date.now();

    logger.info(`${c.req.method} ${c.req.url}`);

    await next();

    const responseTime = Date.now() - startTime;
    logger.info(`${c.req.method} ${c.req.url} - ${c.res.status} (${responseTime}ms)`);
  });
}
