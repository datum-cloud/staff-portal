import { authenticator } from './authenticator';
import type { ISession } from './types';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
import { logger } from '@/utils/logger';

/** Refresh this long before the access token expires, so a request never starts on a token about to lapse. */
export const SESSION_REFRESH_MARGIN_MS = 60_000;

/**
 * How long a refresh result is shared with other requests that present the same
 * refresh token. The browser sends a burst of requests with the old cookie before
 * the first response sets the new one; Zitadel rotates refresh tokens, so a
 * second refresh with the old token would fail and sign the user out.
 */
export const REFRESH_RESULT_TTL_MS = 30_000;

const STRATEGY = 'zitadel';

export type SessionRefreshOutcome =
  | { status: 'skipped' }
  | { status: 'refreshed' | 'failed'; request: Request; setCookies: string[] };

/** True when the access token has expired or expires within the refresh margin. */
export function isRefreshDue(
  expiredAt: Date | string | undefined,
  now: number = Date.now()
): boolean {
  if (!expiredAt) return false;
  const expiresAt = new Date(expiredAt).getTime();
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt - now <= SESSION_REFRESH_MARGIN_MS;
}

const refreshes = new Map<string, Promise<ISession>>();

/** Runs one refresh per refresh token and shares its result for {@link REFRESH_RESULT_TTL_MS}. */
function sharedRefresh(refreshToken: string, run: () => Promise<ISession>): Promise<ISession> {
  const existing = refreshes.get(refreshToken);
  if (existing) return existing;

  const pending = run();
  refreshes.set(refreshToken, pending);
  const forget = () => {
    setTimeout(() => {
      if (refreshes.get(refreshToken) === pending) refreshes.delete(refreshToken);
    }, REFRESH_RESULT_TTL_MS).unref?.();
  };
  pending.then(forget, forget);
  return pending;
}

/** Test hook: drop every shared refresh result. */
export function resetSessionRefreshCache(): void {
  refreshes.clear();
}

/** `name=value` from a Set-Cookie header value. */
function cookiePair(setCookie: string): [string, string] {
  const pair = setCookie.split(';', 1)[0] ?? '';
  const index = pair.indexOf('=');
  return [pair.slice(0, index).trim(), pair.slice(index + 1).trim()];
}

/**
 * Rewrites a Cookie request header: each update replaces the cookie of that
 * name, and a `null` value removes it.
 */
export function replaceCookies(
  cookieHeader: string | null,
  updates: Record<string, string | null>
): string {
  const kept = (cookieHeader ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !(part.slice(0, part.indexOf('=')).trim() in updates));
  const added = Object.entries(updates)
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([name, value]) => `${name}=${value}`);
  return [...kept, ...added].join('; ');
}

/** A copy of `request` whose Cookie header is `cookieHeader`. Body and signal carry over. */
function withCookieHeader(request: Request, cookieHeader: string): Request {
  const headers = new Headers(request.headers);
  if (cookieHeader) headers.set('Cookie', cookieHeader);
  else headers.delete('Cookie');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return new Request(request.url, {
    method: request.method,
    headers,
    signal: request.signal,
    ...(hasBody && { body: request.body, duplex: 'half' }),
  } as RequestInit);
}

const setCookiesOf = (...headers: Headers[]): string[] => headers.flatMap((h) => h.getSetCookie());

/** Applies Set-Cookie values to the request's Cookie header, as the browser would. */
function applySetCookies(request: Request, setCookies: string[], remove: boolean): Request {
  const updates = Object.fromEntries(
    setCookies.map((value) => {
      const [name, cookieValue] = cookiePair(value);
      return [name, remove ? null : cookieValue];
    })
  );
  return withCookieHeader(request, replaceCookies(request.headers.get('Cookie'), updates));
}

/**
 * Refreshes the session when its access token has expired or is about to.
 *
 * On success it returns the Set-Cookie values for the new session and token
 * cookies, plus a copy of the request that already carries them, so loaders and
 * API handlers further down read the new access token. On failure (revoked or
 * invalid refresh token, IdP error) it clears both cookies, and the request then
 * goes through the usual unauthenticated path to login. A session without a
 * refresh token is left alone: the existing re-auth handles it.
 */
export async function refreshSessionIfDue(request: Request): Promise<SessionRefreshOutcome> {
  const { data } = await sessionCookie.get(request);
  if (!data?.refreshToken || !isRefreshDue(data.expiredAt)) {
    return { status: 'skipped' };
  }
  // Strategies register asynchronously at startup; until then, leave the
  // session to the existing re-auth instead of treating it as a failed refresh.
  if (!authenticator.get(STRATEGY)) {
    return { status: 'skipped' };
  }

  try {
    const refreshed = await sharedRefresh(data.refreshToken, () =>
      authenticator.refresh(STRATEGY, request)
    );
    const session = await sessionCookie.set(request, {
      sub: refreshed.sub || data.sub,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? data.refreshToken,
      expiredAt: refreshed.expiredAt,
    });
    const token = await tokenCookie.set(request, { idToken: refreshed.idToken });
    const setCookies = setCookiesOf(session.headers, token.headers);

    return {
      status: 'refreshed',
      request: applySetCookies(request, setCookies, false),
      setCookies,
    };
  } catch (error) {
    logger.warn('Session refresh failed; clearing the session', {
      error: error instanceof Error ? error.message : String(error),
    });
    const session = await sessionCookie.destroy(request);
    const token = await tokenCookie.destroy(request);
    const setCookies = setCookiesOf(session.headers, token.headers);

    return {
      status: 'failed',
      request: applySetCookies(request, setCookies, true),
      setCookies,
    };
  }
}
