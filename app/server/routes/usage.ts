import { loadOrgUsageSummary } from '@/modules/billing/org-usage.server';
import { loadOrgUsageDashboard } from '@/modules/billing/usage.server';
import { EnvVariables } from '@/server/iface';
import { logApiError, logApiSuccess } from '@/server/logger';
import { authMiddleware, getToken } from '@/server/middleware';
import { createErrorResponse, createSuccessResponse } from '@/server/response';
import { captureApiError, createRequestLogger } from '@/utils/logger';
import { Hono } from 'hono';

const usage = new Hono<{ Variables: EnvVariables }>();

/**
 * Organization and project names are DNS-1123 labels. `orgName` ends up in
 * the control-plane URL path, so anything else (e.g. `x/../..`) is rejected.
 */
const RESOURCE_NAME = /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/;

/**
 * GET /api/usage?orgName=&cycle=current
 *
 * Compact org usage summary for the overview card, read from Milo's
 * UsageQuery with the staff member's token.
 */
usage.get('/', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const path = c.req.path;

  const orgName = c.req.query('orgName');
  if (!orgName || !RESOURCE_NAME.test(orgName)) {
    return c.json(
      {
        requestId: reqId,
        code: 'BAD_REQUEST',
        error: 'orgName must be an organization name',
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

/**
 * GET /api/usage/dashboard?orgName=&project=&cycle=
 *
 * Full usage dashboard: billing-cycle windows, grouped meters, and
 * per-dimension series for the org usage page.
 */
usage.get('/dashboard', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const path = c.req.path;

  const orgName = c.req.query('orgName');
  if (!orgName || !RESOURCE_NAME.test(orgName)) {
    return c.json(
      {
        requestId: reqId,
        code: 'BAD_REQUEST',
        error: 'orgName must be an organization name',
        path,
      },
      400
    );
  }

  const project = c.req.query('project');
  if (project && project !== 'all' && !RESOURCE_NAME.test(project)) {
    return c.json(
      {
        requestId: reqId,
        code: 'BAD_REQUEST',
        error: 'project must be a project name',
        path,
      },
      400
    );
  }

  try {
    const token = getToken(c);
    const dashboard = await loadOrgUsageDashboard(orgName, token, {
      projectParam: project,
      cycleParam: c.req.query('cycle'),
    });

    const duration = Math.round(performance.now() - startTime);
    logApiSuccess(reqLogger, {
      path,
      method: c.req.method,
      duration,
      userAgent: c.req.header('User-Agent'),
      ip: c.req.header('x-forwarded-for') || 'unknown',
    });

    return c.json(createSuccessResponse(reqId, dashboard, path), 200, {
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
