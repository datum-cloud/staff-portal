import { authenticator } from './authenticator';
import type { ISession } from './types';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
import { logger } from '@/utils/logger';
import {
  OAuth2RequestError,
  UnexpectedErrorResponseBodyError,
  UnexpectedResponseError,
} from 'remix-auth-oauth2';

/** Refresh this long before the access token expires, so a request never starts on a token about to lapse. */
export const SESSION_REFRESH_MARGIN_MS = 60_000;

/**
 * How long a successful refresh is shared with other requests that present the
 * same refresh token. The browser sends a burst of requests with the old cookie
 * before the first response sets the new one; Zitadel rotates refresh tokens, so
 * a second refresh with the old token would fail and sign the user out. A failed
 * refresh is never shared beyond the requests already waiting on it.
 */
export const REFRESH_RESULT_TTL_MS = 10_000;

const STRATEGY = 'zitadel';

/**
 * - `skipped`: nothing to do; use the request as it is.
 * - `refreshed`: new cookies, already on `request`.
 * - `failed`: the session can't be renewed; its cookies are cleared.
 * - `unavailable`: the IdP couldn't be reached; the cookies stay, but `request`
 *   carries no session, so this one request runs unauthenticated.
 */
export type SessionRefreshOutcome =
  | { status: 'skipped' }
  | { status: 'refreshed' | 'failed' | 'unavailable'; request: Request; setCookies: string[] };

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

/**
 * Runs one refresh per refresh token. A success is shared for
 * {@link REFRESH_RESULT_TTL_MS}; a failure is forgotten as soon as it settles,
 * so the next request tries again.
 */
function sharedRefresh(refreshToken: string, run: () => Promise<ISession>): Promise<ISession> {
  const existing = refreshes.get(refreshToken);
  if (existing) return existing;

  const pending = run();
  refreshes.set(refreshToken, pending);
  const forget = () => {
    if (refreshes.get(refreshToken) === pending) refreshes.delete(refreshToken);
  };
  pending.then(() => setTimeout(forget, REFRESH_RESULT_TTL_MS).unref?.(), forget);
  return pending;
}

const isClientErrorStatus = (status: number): boolean => status >= 400 && status < 500;

/**
 * True when the IdP rejected the refresh token itself: an OAuth error body
 * (`invalid_grant` and friends, sent with 400/401) or any other 4xx. A 5xx, a
 * network failure or anything unexpected is not proof the token is bad.
 */
export function isRefreshTokenRejected(error: unknown): boolean {
  if (error instanceof OAuth2RequestError) return true;
  if (
    error instanceof UnexpectedResponseError ||
    error instanceof UnexpectedErrorResponseBodyError
  ) {
    return isClientErrorStatus(error.status);
  }
  return false;
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

const SESSION_COOKIE_NAMES = ['_session', '_token'];

/** A copy of `request` without the session cookies, so it runs unauthenticated. */
function withoutSession(request: Request): Request {
  const updates = Object.fromEntries(SESSION_COOKIE_NAMES.map((name) => [name, null]));
  return withCookieHeader(request, replaceCookies(request.headers.get('Cookie'), updates));
}

/** Expires both session cookies; the request then goes the usual way to login. */
async function clearSession(request: Request): Promise<SessionRefreshOutcome> {
  const session = await sessionCookie.destroy(request);
  const token = await tokenCookie.destroy(request);
  const setCookies = setCookiesOf(session.headers, token.headers);
  return { status: 'failed', request: applySetCookies(request, setCookies, true), setCookies };
}

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
 * API handlers further down read the new access token. The new cookies keep the
 * session's original issue time, so its absolute lifetime still applies.
 *
 * A cookie still in the old signed-only format is never refreshed: it may have
 * been copied from a log, so it is cleared and the request goes to login. The
 * same happens when the IdP rejects the refresh token. When the IdP fails
 * (5xx, network), the cookies stay and only this request runs unauthenticated.
 * A session without a refresh token is left alone: the existing re-auth handles it.
 */
export async function refreshSessionIfDue(request: Request): Promise<SessionRefreshOutcome> {
  const { data, issuedAt, isLegacy } = await sessionCookie.get(request);
  if (!data?.refreshToken || !isRefreshDue(data.expiredAt)) {
    return { status: 'skipped' };
  }
  if (isLegacy) {
    logger.warn('Session cookie in the old format is due for refresh; asking for a new login');
    return clearSession(request);
  }
  // Strategies register asynchronously at startup; until then, leave the
  // session to the existing re-auth instead of treating it as a failed refresh.
  if (!authenticator.get(STRATEGY)) {
    return { status: 'skipped' };
  }

  let refreshed: ISession;
  try {
    refreshed = await sharedRefresh(data.refreshToken, () =>
      authenticator.refresh(STRATEGY, request)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isRefreshTokenRejected(error)) {
      logger.warn('Refresh token rejected; clearing the session', { error: message });
      return clearSession(request);
    }
    logger.warn('Session refresh failed; continuing without a session for this request', {
      error: message,
    });
    return { status: 'unavailable', request: withoutSession(request), setCookies: [] };
  }

  const cookieOptions = { issuedAt };
  const session = await sessionCookie.set(
    request,
    {
      sub: refreshed.sub || data.sub,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? data.refreshToken,
      expiredAt: refreshed.expiredAt,
    },
    cookieOptions
  );
  const token = await tokenCookie.set(request, { idToken: refreshed.idToken }, cookieOptions);
  const setCookies = setCookiesOf(session.headers, token.headers);

  return {
    status: 'refreshed',
    request: applySetCookies(request, setCookies, false),
    setCookies,
  };
}
