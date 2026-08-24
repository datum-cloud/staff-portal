import { EnvVariables } from '@/server/iface';
import { authMiddleware, getToken } from '@/server/middleware';
import { env } from '@/utils/config/env.server';
import { captureApiError, logger } from '@/utils/logger';
import { Hono } from 'hono';

/**
 * GraphQL proxy route. Forwards POST requests from the browser to the
 * graphql-gateway with the caller's bearer token attached. Single global
 * endpoint — staff-portal does not use the user/org/project scoped paths
 * cloud-portal exposes.
 */
export const graphqlRoutes = new Hono<{ Variables: EnvVariables }>();

graphqlRoutes.all('/', authMiddleware(), async (c) => {
  const token = getToken(c);

  const controller = new AbortController();
  c.req.raw.signal?.addEventListener('abort', () => controller.abort());

  const browserUA = c.req.header('User-Agent');

  try {
    const response = await fetch(`${env.GRAPHQL_URL}/graphql`, {
      method: c.req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Request-ID': c.get('requestId') ?? '',
        ...(c.req.header('sentry-trace') ? { 'sentry-trace': c.req.header('sentry-trace')! } : {}),
        ...(c.req.header('baggage') ? { baggage: c.req.header('baggage')! } : {}),
        ...(browserUA ? { 'User-Agent': browserUA } : {}),
      },
      body: c.req.method !== 'GET' ? await c.req.text() : undefined,
      signal: controller.signal,
    });

    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 });
    }

    const requestId = c.get('requestId') ?? undefined;
    const err = error instanceof Error ? error : new Error('GraphQL proxy error');

    // Route through the structured logger + Sentry like the axios interceptors,
    // instead of a bare console.error that never reaches observability.
    logger.error('GraphQL proxy error', {
      requestId,
      url: `${env.GRAPHQL_URL}/graphql`,
      method: c.req.method,
      error: err.message,
    });
    captureApiError(err, {
      url: `${env.GRAPHQL_URL}/graphql`,
      method: c.req.method,
      status: 502,
      requestId,
    });

    return c.json({ error: err.message, requestId }, 502);
  }
});
