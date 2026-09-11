import { apiRequest } from '@/modules/axios/axios.server';
import { EnvVariables } from '@/server/iface';
import { buildProxyRequest, isClientAbort } from '@/server/lib/proxy';
import { proxyWatch } from '@/server/lib/watch';
import { logApiError, logApiSuccess } from '@/server/logger';
import { authMiddleware } from '@/server/middleware';
import {
  createErrorResponse,
  createSuccessResponseWithHeaders,
  extractRequestContext,
} from '@/server/response';
import { env } from '@/utils/config/env.server';
import { captureApiError, createRequestLogger } from '@/utils/logger';
import { Hono } from 'hono';

/**
 * Internal API proxy — catch-all for `/api/internal/*`. Forwards the browser's
 * request to the Datum API with the caller's bearer token, on one of two
 * transports:
 *
 * - **Watch** (`?watch=…`): piped straight through unbuffered, since the stream
 *   never completes and the JSON envelope would corrupt the newline-delimited
 *   events (see `lib/watch.ts`).
 * - **Everything else**: buffered through the axios client, which throws typed
 *   `AppError`s that the shared catch turns into the standard error envelope.
 *
 * Both share `buildProxyRequest` for prep and the same success/error logging.
 */
export const internalRoutes = new Hono<{ Variables: EnvVariables }>();

internalRoutes.all('/*', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const requestContext = extractRequestContext(c);

  reqLogger.info('API Request Started', requestContext);

  try {
    const req = await buildProxyRequest(c, env.API_URL);
    const logContext = {
      path: req.path,
      method: req.method,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    };

    if (req.isWatch) {
      const watchResponse = await proxyWatch({
        url: req.url,
        method: req.method,
        headers: req.headers,
        requestId: reqId,
        signal: c.req.raw.signal,
        body: req.body,
      });
      const duration = Math.round(performance.now() - startTime);

      // A watch that opened non-2xx is a failed request, not a live stream, and
      // `fetch` never throws on HTTP status — so log + report it here (parity
      // with the buffered path's catch). The response still carries the real
      // upstream status + body, so the client sees the true error.
      if (!watchResponse.ok) {
        await logApiError(reqLogger, watchResponse.clone(), { ...logContext, duration });
        const watchError = new Error(`Watch request failed: ${req.method} ${req.path}`);
        watchError.name = 'WatchRequestError';
        captureApiError(watchError, {
          url: req.path,
          method: req.method,
          status: watchResponse.status,
          requestId: reqId,
        });
      } else {
        logApiSuccess(reqLogger, { ...logContext, duration });
      }

      return watchResponse;
    }

    const response = await apiRequest({
      method: req.method,
      url: req.target,
      headers: req.headers,
      ...(req.body && { data: req.body }),
    }).execute();

    logApiSuccess(reqLogger, {
      ...logContext,
      duration: Math.round(performance.now() - startTime),
    });

    return createSuccessResponseWithHeaders(c, reqId, response, req.path);
  } catch (error) {
    // Client went away mid-request — answer 499 rather than logging it as an
    // error / reporting it to Sentry (see isClientAbort).
    if (isClientAbort(c, error)) {
      return new Response(null, { status: 499 });
    }

    const path = c.req.path.replace(/^\/api\/internal/, '').replace(/^\//, '');
    const duration = Math.round(performance.now() - startTime);

    await logApiError(reqLogger, error, {
      path,
      method: c.req.method,
      duration,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    });

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
