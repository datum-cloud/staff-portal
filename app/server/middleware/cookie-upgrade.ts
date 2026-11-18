import { sessionCookie, tokenCookie } from '@/utils/cookies';
import { logger } from '@/utils/logger';
import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

const UPGRADED_COOKIES = [
  { name: '_session', cookie: sessionCookie },
  { name: '_token', cookie: tokenCookie },
] as const;

/** Names of the cookies a response already sets, so an upgrade never overrides them. */
const cookiesSetBy = (res: Response): Set<string> =>
  new Set(res.headers.getSetCookie().map((header) => header.split('=', 1)[0].trim()));

/**
 * Re-issues session and token cookies still in the old signed-only format as
 * encrypted cookies, on whatever response the request gets. Skips a cookie the
 * response already sets (sign-in, sign-out, re-auth).
 */
export function cookieUpgradeMiddleware() {
  return createMiddleware(async (c: Context, next: Next) => {
    await next();

    try {
      const alreadySet = cookiesSetBy(c.res);
      const upgrades = await Promise.all(
        UPGRADED_COOKIES.filter(({ name }) => !alreadySet.has(name)).map(({ cookie }) =>
          cookie.upgrade(c.req.raw)
        )
      );
      const setCookies = upgrades.filter((header): header is string => header !== null);
      if (setCookies.length === 0) return;

      // Copy the response: some (Response.redirect, proxied fetches) have
      // immutable headers.
      const res = new Response(c.res.body, c.res);
      setCookies.forEach((header) => res.headers.append('Set-Cookie', header));
      c.res = res;
    } catch (error) {
      // An upgrade is best effort: the old cookie still works on the next request.
      logger.warn('Session cookie upgrade failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
