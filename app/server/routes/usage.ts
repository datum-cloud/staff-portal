import { loadOrgUsageSummary } from '@/modules/billing/org-usage.server';
import { EnvVariables } from '@/server/iface';
import { logApiError, logApiSuccess } from '@/server/logger';
import { authMiddleware, getToken } from '@/server/middleware';
import { createErrorResponse, createSuccessResponse } from '@/server/response';
import { captureApiError, createRequestLogger } from '@/utils/logger';
import { Hono } from 'hono';

const usage = new Hono<{ Variables: EnvVariables }>();

/**
 * GET /api/usage?orgName=&cycle=current
 *
 * Compact org usage summary for the overview card. Amberflo credentials
 * stay server-side.
 */
usage.get('/', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const path = c.req.path;

  const orgName = c.req.query('orgName');
  if (!orgName) {
    return c.json(
      {
        requestId: reqId,
        code: 'BAD_REQUEST',
        error: 'orgName is required',
        path,
      },
      400
    );
  }

  try {
    const token = getToken(c);
    const summary = await loadOrgUsageSummary(orgName, token, c.req.query('cycle') ?? 'current');

    const duration = Math.round(performance.now() - startTime);
    logApiSuccess(reqLogger, {
      path,
      method: c.req.method,
      duration,
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('x-forwarded-for') || 'unknown',
    });

    return c.json(createSuccessResponse(reqId, summary, path), 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    await logApiError(reqLogger, error, {
      path,
      method: c.req.method,
      duration,
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('x-forwarded-for') || 'unknown',
    });

    if (error instanceof Error) {
      captureApiError(error, { url: path, method: c.req.method, requestId: reqId });
    }

    const { response, status } = await createErrorResponse(reqId, error, path);
    return c.json(response, status as any);
  }
});

export { usage as usageRoutes };
