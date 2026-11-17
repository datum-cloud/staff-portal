import { refreshSessionIfDue } from '@/modules/auth/session-refresh.server';
import { routes } from '@/utils/config/routes.config';
import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

/**
 * Paths that manage the session themselves. The callback writes a new session,
 * re-auth and logout clear it (logout needs the id token a failed refresh would
 * drop), and login starts from no session.
 */
const SKIPPED_PATHS = [routes.login(), routes.logout(), '/auth/'];

const isSkipped = (path: string): boolean =>
  SKIPPED_PATHS.some((skipped) =>
    skipped.endsWith('/') ? path.startsWith(skipped) : path === skipped
  );

/**
 * Appends Set-Cookie values to the context's response. Hono's `c.res` setter
 * copies the previous response's cookies over the new one, so append in place
 * and only swap in a mutable copy first when the headers are immutable (e.g. a
 * `Response.redirect`).
 */
function appendSetCookies(c: Context, setCookies: string[]): void {
  try {
    setCookies.forEach((value) => c.res.headers.append('Set-Cookie', value));
  } catch {
    c.res = new Response(c.res.body, c.res);
    setCookies.forEach((value) => c.res.headers.append('Set-Cookie', value));
  }
}

/**
 * Refreshes an expired or nearly expired session before anything reads it.
 *
 * Runs ahead of the request-context middleware, the API auth middleware and the
 * React Router loaders, and swaps in a request that carries the new cookies, so
 * all of them see the same, current access token. The new cookies (or, after a
 * failed refresh, the cleared ones) go back on the response.
 */
export function sessionRefreshMiddleware() {
  return createMiddleware(async (c: Context, next: Next) => {
    if (isSkipped(c.req.path)) return next();

    const outcome = await refreshSessionIfDue(c.req.raw);
    if (outcome.status === 'skipped') return next();

    c.req.raw = outcome.request;
    await next();
    appendSetCookies(c, outcome.setCookies);
  });
}
