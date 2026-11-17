import { authenticator } from './authenticator';
import {
  isRefreshDue,
  refreshSessionIfDue,
  replaceCookies,
  resetSessionRefreshCache,
  SESSION_REFRESH_MARGIN_MS,
} from './session-refresh.server';
import { sessionRefreshMiddleware } from '@/server/middleware/session-refresh';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./authenticator', () => ({
  authenticator: { get: vi.fn(), refresh: vi.fn() },
}));

const refresh = vi.mocked(authenticator.refresh);
const getStrategy = vi.mocked(authenticator.get);

const NOW = Date.now();
const URL_ = 'http://localhost:3000/customers/users';

/** A request carrying session and token cookies whose access token expires at `expiredAt`. */
async function requestWithSession(
  expiredAt: Date,
  refreshToken: string | null = 'refresh-old'
): Promise<Request> {
  const blank = new Request(URL_);
  const session = await sessionCookie.set(blank, {
    sub: 'staff-1',
    accessToken: 'access-old',
    refreshToken,
    expiredAt,
  });
  const token = await tokenCookie.set(blank, { idToken: 'id-old' });
  const cookie = [...session.headers.getSetCookie(), ...token.headers.getSetCookie()]
    .map((value) => value.split(';')[0])
    .join('; ');
  return new Request(URL_, { headers: { Cookie: `lng=en; ${cookie}` } });
}

/** The middleware in front of a handler that reports the access token it was given. */
const sessionMiddlewareApp = () =>
  new Hono().use(sessionRefreshMiddleware()).all('*', async (c) => {
    const session = await sessionCookie.get(c.req.raw);
    return c.json({ accessToken: session.data?.accessToken ?? null });
  });

const refreshed = {
  sub: 'staff-1',
  idToken: 'id-new',
  accessToken: 'access-new',
  refreshToken: 'refresh-new',
  expiredAt: new Date(NOW + 60 * 60 * 1000),
};

describe('isRefreshDue', () => {
  it('is due once the token has expired', () => {
    expect(isRefreshDue(new Date(NOW - 1000), NOW)).toBe(true);
  });

  it('is due inside the margin before expiry', () => {
    expect(isRefreshDue(new Date(NOW + SESSION_REFRESH_MARGIN_MS - 1000), NOW)).toBe(true);
  });

  it('is not due outside the margin', () => {
    expect(isRefreshDue(new Date(NOW + SESSION_REFRESH_MARGIN_MS + 1000), NOW)).toBe(false);
  });

  it('reads the ISO string a cookie round trip leaves behind', () => {
    expect(isRefreshDue(new Date(NOW - 1000).toISOString(), NOW)).toBe(true);
  });

  it('is not due without an expiry', () => {
    expect(isRefreshDue(undefined, NOW)).toBe(false);
  });
});

describe('replaceCookies', () => {
  it('replaces, removes and keeps cookies by name', () => {
    expect(
      replaceCookies('lng=en; _session=old; _token=old', { _session: 'new', _token: null })
    ).toBe('lng=en; _session=new');
  });
});

describe('refreshSessionIfDue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetSessionRefreshCache();
    getStrategy.mockReturnValue({} as never);
  });

  it('refreshes an expired session and hands on a request with the new tokens', async () => {
    refresh.mockResolvedValue(refreshed);
    const outcome = await refreshSessionIfDue(await requestWithSession(new Date(NOW - 1000)));

    expect(refresh).toHaveBeenCalledWith('zitadel', expect.any(Request));
    expect(outcome.status).toBe('refreshed');
    if (outcome.status === 'skipped') return;

    const session = await sessionCookie.get(outcome.request);
    const token = await tokenCookie.get(outcome.request);
    expect(session.data).toMatchObject({ accessToken: 'access-new', refreshToken: 'refresh-new' });
    expect(token.data?.idToken).toBe('id-new');
    expect(outcome.request.headers.get('Cookie')).toContain('lng=en');
    expect(outcome.setCookies.map((v) => v.split('=')[0])).toEqual(['_session', '_token']);
  });

  it('refreshes a token that expires inside the margin', async () => {
    refresh.mockResolvedValue(refreshed);
    const outcome = await refreshSessionIfDue(
      await requestWithSession(new Date(NOW + SESSION_REFRESH_MARGIN_MS / 2))
    );
    expect(outcome.status).toBe('refreshed');
  });

  it('leaves a session outside the margin alone', async () => {
    const outcome = await refreshSessionIfDue(
      await requestWithSession(new Date(NOW + 60 * 60 * 1000))
    );
    expect(outcome.status).toBe('skipped');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('leaves a session without a refresh token to the existing re-auth', async () => {
    const outcome = await refreshSessionIfDue(await requestWithSession(new Date(NOW - 1000), null));
    expect(outcome.status).toBe('skipped');
  });

  it('skips while the strategy has not registered yet', async () => {
    getStrategy.mockReturnValue(null);
    const outcome = await refreshSessionIfDue(await requestWithSession(new Date(NOW - 1000)));
    expect(outcome.status).toBe('skipped');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('keeps the old refresh token when the IdP does not rotate it', async () => {
    refresh.mockResolvedValue({ ...refreshed, refreshToken: null });
    const outcome = await refreshSessionIfDue(await requestWithSession(new Date(NOW - 1000)));
    if (outcome.status === 'skipped') throw new Error('expected a refresh');
    const session = await sessionCookie.get(outcome.request);
    expect(session.data?.refreshToken).toBe('refresh-old');
  });

  it('clears the session when the refresh fails', async () => {
    refresh.mockRejectedValue(new Error('invalid_grant'));
    const outcome = await refreshSessionIfDue(await requestWithSession(new Date(NOW - 1000)));

    expect(outcome.status).toBe('failed');
    if (outcome.status === 'skipped') return;
    expect(outcome.request.headers.get('Cookie')).toBe('lng=en');
    expect((await sessionCookie.get(outcome.request)).data).toBeUndefined();
    expect(outcome.setCookies).toHaveLength(2);
    outcome.setCookies.forEach((value) =>
      expect(value).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/)
    );
  });

  it('refreshes once for a burst of requests with the same refresh token', async () => {
    let resolve: (value: typeof refreshed) => void = () => {};
    refresh.mockReturnValue(new Promise((r) => (resolve = r)));
    const request = await requestWithSession(new Date(NOW - 1000));

    const burst = Promise.all([1, 2, 3].map(() => refreshSessionIfDue(request.clone())));
    // Let each call reach the shared refresh before it settles.
    await new Promise((r) => setTimeout(r, 0));
    resolve(refreshed);
    const outcomes = await burst;

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(outcomes.map((o) => o.status)).toEqual(['refreshed', 'refreshed', 'refreshed']);
    // A request that arrives after the refresh settled, still with the old cookie, reuses it.
    expect((await refreshSessionIfDue(request.clone())).status).toBe('refreshed');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('sessionRefreshMiddleware', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetSessionRefreshCache();
    getStrategy.mockReturnValue({} as never);
  });

  it('lets the request continue with the new tokens and sets the new cookies', async () => {
    refresh.mockResolvedValue(refreshed);
    const request = await requestWithSession(new Date(NOW - 1000));

    const response = await sessionMiddlewareApp().request(URL_, { headers: request.headers });

    expect(await response.json()).toEqual({ accessToken: 'access-new' });
    expect(response.headers.getSetCookie().map((v) => v.split('=')[0])).toEqual([
      '_session',
      '_token',
    ]);
  });

  it('clears the session on a failed refresh, so the handler sees no session', async () => {
    refresh.mockRejectedValue(new Error('invalid_grant'));
    const request = await requestWithSession(new Date(NOW - 1000));

    const response = await sessionMiddlewareApp().request(URL_, { headers: request.headers });

    expect(await response.json()).toEqual({ accessToken: null });
    expect(response.headers.getSetCookie()).toHaveLength(2);
  });

  it('does not refresh on logout, which needs the id token', async () => {
    const request = await requestWithSession(new Date(NOW - 1000));
    await sessionMiddlewareApp().request('http://localhost:3000/logout', {
      headers: request.headers,
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
