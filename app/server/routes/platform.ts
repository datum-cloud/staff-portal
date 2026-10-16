import { datumGet, datumPost } from '@/modules/assistant/tools/api-helpers';
import { EnvVariables } from '@/server/iface';
import { logApiError, logApiSuccess } from '@/server/logger';
import { authMiddleware, getToken } from '@/server/middleware';
import { createErrorResponse, createSuccessResponse } from '@/server/response';
import { captureApiError, createRequestLogger } from '@/utils/logger';
import { Hono } from 'hono';
import { createHash } from 'node:crypto';

const platform = new Hono<{ Variables: EnvVariables }>();

const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;
// The activity API has no count/aggregate endpoint, so totals come from paging
// create events. Cap the walk so a sign-up spike can't stall the landing page;
// a capped count is flagged `truncated` and rendered as "N+".
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

const RESOURCES = {
  users: 'users',
  organizations: 'organizations',
  projects: 'projects',
} as const;

type GrowthResource = keyof typeof RESOURCES;

interface GrowthCount {
  last7d: number;
  last30d: number;
  truncated: boolean;
}

export type PlatformGrowth = Record<GrowthResource, GrowthCount>;

// Keyed by a hash of the caller's token so a cached result is only ever served
// back to the session that was allowed to read it.
const growthCache = new Map<string, { data: PlatformGrowth; expiresAt: number }>();

async function countCreates(resource: string, token: string): Promise<GrowthCount> {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * DAY_MS;
  const filter = [
    `verb == 'create'`,
    `objectRef.resource == '${resource}'`,
    `responseStatus.code in [200, 201]`,
  ].join(' && ');

  // Dedupe by name: retried or replayed creates can appear more than once.
  const last30d = new Set<string>();
  const last7d = new Set<string>();
  let cursor: string | undefined;
  let pages = 0;

  do {
    const result = await datumPost(
      '/apis/activity.miloapis.com/v1alpha1/auditlogqueries',
      {
        apiVersion: 'activity.miloapis.com/v1alpha1',
        kind: 'AuditLogQuery',
        metadata: { name: `growth-${resource}-${now}-${pages}` },
        spec: {
          startTime: new Date(now - 30 * DAY_MS).toISOString(),
          endTime: new Date(now).toISOString(),
          limit: PAGE_SIZE,
          filter,
          ...(cursor ? { continue: cursor } : {}),
        },
      },
      token
    );
    if (result?.error) throw new Error(result.error);

    for (const event of result?.status?.results ?? []) {
      // generateName creates (orgs, projects) leave objectRef.name empty; the
      // created object's name is only on the response.
      const name = event?.responseObject?.metadata?.name ?? event?.objectRef?.name;
      if (!name) continue;
      last30d.add(name);
      const ts = Date.parse(event.requestReceivedTimestamp ?? event.stageTimestamp ?? '');
      if (ts >= sevenDaysAgo) last7d.add(name);
    }

    cursor = result?.status?.continue || undefined;
    pages += 1;
  } while (cursor && pages < MAX_PAGES);

  return { last7d: last7d.size, last30d: last30d.size, truncated: !!cursor };
}

export interface EmailDelivery {
  delivered: number;
  failed: number;
  pending: number;
  truncated: boolean;
}

const EMAIL_PAGE_SIZE = 500;
const EMAIL_MAX_PAGES = 10;

/**
 * Delivery outcome of emails sent in the last 24 hours. Email lists come back
 * in name order with no time filter, so this walks the whole list and keeps
 * only the recent ones.
 */
async function summarizeEmailDelivery(token: string): Promise<EmailDelivery> {
  const since = Date.now() - DAY_MS;
  const summary: EmailDelivery = { delivered: 0, failed: 0, pending: 0, truncated: false };
  let cursor: string | undefined;
  let pages = 0;

  do {
    const query = new URLSearchParams({ limit: String(EMAIL_PAGE_SIZE) });
    if (cursor) query.set('continue', cursor);
    const result = await datumGet(
      `/apis/notification.miloapis.com/v1alpha1/namespaces/milo-system/emails?${query}`,
      token
    );
    if (result?.error) throw new Error(result.error);

    for (const email of result?.items ?? []) {
      if (Date.parse(email?.metadata?.creationTimestamp ?? '') < since) continue;
      // Same reading as the email activity list: the first condition is delivery.
      const status = email?.status?.conditions?.[0]?.status;
      if (status === 'True') summary.delivered += 1;
      else if (status === 'False') summary.failed += 1;
      else summary.pending += 1;
    }

    cursor = result?.metadata?.continue || undefined;
    pages += 1;
  } while (cursor && pages < EMAIL_MAX_PAGES);

  summary.truncated = !!cursor;
  return summary;
}

/**
 * GET /api/platform/growth
 *
 * New users / organizations / projects over the last 7 and 30 days, counted
 * from audit-log create events. Cached for five minutes per session.
 */
platform.get('/growth', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const path = c.req.path;

  try {
    const token = getToken(c);
    const cacheKey = createHash('sha256').update(token).digest('hex');
    const cached = growthCache.get(cacheKey);

    let data: PlatformGrowth;
    if (cached && cached.expiresAt > Date.now()) {
      data = cached.data;
    } else {
      const [users, organizations, projects] = await Promise.all([
        countCreates(RESOURCES.users, token),
        countCreates(RESOURCES.organizations, token),
        countCreates(RESOURCES.projects, token),
      ]);
      data = { users, organizations, projects };

      for (const [key, entry] of growthCache) {
        if (entry.expiresAt <= Date.now()) growthCache.delete(key);
      }
      growthCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    logApiSuccess(reqLogger, {
      path,
      method: c.req.method,
      duration: Math.round(performance.now() - startTime),
    });

    return c.json(createSuccessResponse(reqId, data, path), 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
  } catch (error) {
    await logApiError(reqLogger, error, {
      path,
      method: c.req.method,
      duration: Math.round(performance.now() - startTime),
    });

    if (error instanceof Error) {
      captureApiError(error, { url: path, method: c.req.method, requestId: reqId });
    }

    const { response, status } = await createErrorResponse(reqId, error, path);
    return c.json(response, status as any);
  }
});

const emailCache = new Map<string, { data: EmailDelivery; expiresAt: number }>();

/**
 * GET /api/platform/email-delivery
 *
 * Delivered / failed / pending counts for emails sent in the last 24 hours.
 * Cached for five minutes per session.
 */
platform.get('/email-delivery', authMiddleware(), async (c) => {
  const startTime = performance.now();
  const reqLogger = createRequestLogger(c);
  const reqId = c.get('requestId');
  const path = c.req.path;

  try {
    const token = getToken(c);
    const cacheKey = createHash('sha256').update(token).digest('hex');
    const cached = emailCache.get(cacheKey);

    let data: EmailDelivery;
    if (cached && cached.expiresAt > Date.now()) {
      data = cached.data;
    } else {
      data = await summarizeEmailDelivery(token);
      for (const [key, entry] of emailCache) {
        if (entry.expiresAt <= Date.now()) emailCache.delete(key);
      }
      emailCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    logApiSuccess(reqLogger, {
      path,
      method: c.req.method,
      duration: Math.round(performance.now() - startTime),
    });

    return c.json(createSuccessResponse(reqId, data, path), 200, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
  } catch (error) {
    await logApiError(reqLogger, error, {
      path,
      method: c.req.method,
      duration: Math.round(performance.now() - startTime),
    });

    if (error instanceof Error) {
      captureApiError(error, { url: path, method: c.req.method, requestId: reqId });
    }

    const { response, status } = await createErrorResponse(reqId, error, path);
    return c.json(response, status as any);
  }
});

export { platform as platformRoutes };
