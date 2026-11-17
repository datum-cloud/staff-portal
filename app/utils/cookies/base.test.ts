import { SESSION_MAX_AGE_SECONDS } from './base';
import { sealCookieValue } from './cipher';
import { sessionCookie } from './session';
import { tokenCookie } from './token';
import { createCookie, createCookieSessionStorage } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

const SECRET = 'test-session-secret-at-least-32-chars'; // vitest.config.ts SESSION_SECRET

const SESSION = {
  sub: 'user-123',
  accessToken: 'secret-access-token',
  refreshToken: 'secret-refresh-token',
  expiredAt: new Date('2030-01-01T00:00:00.000Z'),
};

/** The `name=value` part of a Set-Cookie header, usable as a request Cookie header. */
const cookiePair = (headers: Headers): string => headers.get('Set-Cookie')!.split(';')[0];

const requestWith = (cookie: string) =>
  new Request('http://localhost:3000/', { headers: { Cookie: cookie } });

/** Builds a cookie the way the app wrote it before encryption: signed JSON, readable by anyone. */
async function legacyCookie(name: string, data: unknown): Promise<string> {
  const cookie = createCookie(name, { path: '/', httpOnly: true, secrets: [SECRET] });
  const storage = createCookieSessionStorage({ cookie });
  const session = await storage.getSession();
  session.set(name, data);
  return (await storage.commitSession(session)).split(';')[0];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The Max-Age attribute of a Set-Cookie header, in seconds. */
const maxAgeOf = (headers: Headers): number =>
  Number(/Max-Age=(\d+)/.exec(headers.get('Set-Cookie')!)![1]);

describe('BaseCookie', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips an encrypted session cookie', async () => {
    const { headers } = await sessionCookie.set(requestWith(''), SESSION);

    const { data } = await sessionCookie.get(requestWith(cookiePair(headers)));

    expect(data).toEqual({ ...SESSION, expiredAt: SESSION.expiredAt.toISOString() });
  });

  it('keeps the tokens out of the raw cookie value', async () => {
    const { headers } = await sessionCookie.set(requestWith(''), SESSION);
    const raw = decodeURIComponent(headers.get('Set-Cookie')!);
    const decoded = Buffer.from(cookiePair(headers).split('=')[1], 'base64').toString('latin1');

    for (const text of [raw, decoded]) {
      expect(text).not.toContain('secret-access-token');
      expect(text).not.toContain('secret-refresh-token');
      expect(text).not.toContain('user-123');
    }
  });

  it('marks the cookie HttpOnly, SameSite=Lax and Secure outside local development', async () => {
    const { headers } = await sessionCookie.set(requestWith(''), SESSION);
    const setCookie = headers.get('Set-Cookie')!;

    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Secure');
  });

  it('encrypts the token cookie too', async () => {
    const { headers } = await tokenCookie.set(requestWith(''), { idToken: 'secret-id-token' });

    expect(headers.get('Set-Cookie')).not.toContain('secret-id-token');
    const { data } = await tokenCookie.get(requestWith(cookiePair(headers)));
    expect(data).toEqual({ idToken: 'secret-id-token' });
  });

  it('rejects a tampered cookie', async () => {
    const { headers } = await sessionCookie.set(requestWith(''), SESSION);
    const pair = cookiePair(headers);
    const tampered = `${pair.slice(0, -2)}${pair.endsWith('AA') ? 'BB' : 'AA'}`;

    expect((await sessionCookie.get(requestWith(tampered))).data).toBeUndefined();
  });

  it('does not open a session value sent as the token cookie', async () => {
    const { headers } = await sessionCookie.set(requestWith(''), SESSION);
    const value = cookiePair(headers).split('=')[1];

    expect((await tokenCookie.get(requestWith(`_token=${value}`))).data).toBeUndefined();
  });

  it('sends no cookie when the request has none', async () => {
    const { data, headers } = await sessionCookie.get(requestWith(''));

    expect(data).toBeUndefined();
    expect(headers.get('Set-Cookie')).toBeNull();
  });

  it('expires the cookie on destroy', async () => {
    const { headers } = await sessionCookie.destroy(requestWith(''));

    expect(headers.get('Set-Cookie')).toMatch(/^_session=; Max-Age=0;/);
  });

  describe('session lifetime', () => {
    it('records when the session began and reports a sealed cookie as not legacy', async () => {
      vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00.000Z') });
      const { headers } = await sessionCookie.set(requestWith(''), SESSION);

      const read = await sessionCookie.get(requestWith(cookiePair(headers)));

      expect(read.issuedAt).toBe(Date.parse('2030-01-01T00:00:00.000Z'));
      expect(read.isLegacy).toBe(false);
    });

    it('keeps the original issue time when the cookie is re-issued', async () => {
      vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00.000Z') });
      const issuedAt = Date.now();
      const first = await sessionCookie.set(requestWith(''), SESSION);
      vi.advanceTimersByTime(3 * DAY_MS);

      const reissued = await sessionCookie.get(requestWith(cookiePair(first.headers)));
      const reread = await sessionCookie.get(requestWith(cookiePair(reissued.headers)));

      expect(reread.issuedAt).toBe(issuedAt);
    });

    it('keeps an issue time passed to set', async () => {
      const issuedAt = Date.now() - 5 * DAY_MS;
      const { headers } = await sessionCookie.set(requestWith(''), SESSION, { issuedAt });

      expect((await sessionCookie.get(requestWith(cookiePair(headers)))).issuedAt).toBe(issuedAt);
    });

    it('treats a cookie older than the absolute limit as no session', async () => {
      vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00.000Z') });
      const { headers } = await sessionCookie.set(requestWith(''), SESSION);
      vi.advanceTimersByTime(SESSION_MAX_AGE_SECONDS * 1000);

      const read = await sessionCookie.get(requestWith(cookiePair(headers)));

      expect(read.data).toBeUndefined();
      expect(read.headers.get('Set-Cookie')).toBeNull();
    });

    it('never sets a Max-Age past the absolute limit', async () => {
      vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00.000Z') });
      const issuedAt = Date.now() - (SESSION_MAX_AGE_SECONDS * 1000 - DAY_MS);

      const { headers } = await sessionCookie.set(requestWith(''), SESSION, { issuedAt });

      expect(maxAgeOf(headers)).toBe(24 * 60 * 60);
    });

    it('uses the full cookie Max-Age for a new session', async () => {
      const { headers } = await sessionCookie.set(requestWith(''), SESSION);

      expect(maxAgeOf(headers)).toBe(7 * 24 * 60 * 60);
    });

    it('rejects a sealed cookie that carries no issue time', async () => {
      const value = sealCookieValue(JSON.stringify(SESSION), SECRET, '_session');

      expect((await sessionCookie.get(requestWith(`_session=${value}`))).data).toBeUndefined();
    });
  });

  describe('old signed-only cookies', () => {
    it('reports an old cookie as legacy', async () => {
      const legacy = await legacyCookie('_session', SESSION);

      expect((await sessionCookie.get(requestWith(legacy))).isLegacy).toBe(true);
    });

    it('starts the session at the upgrade', async () => {
      vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00.000Z') });
      const legacy = await legacyCookie('_session', SESSION);

      const upgraded = await sessionCookie.upgrade(requestWith(legacy));
      const read = await sessionCookie.get(requestWith(upgraded!.split(';')[0]));

      expect(read.issuedAt).toBe(Date.parse('2030-01-01T00:00:00.000Z'));
      expect(read.isLegacy).toBe(false);
    });

    it('still reads one and re-issues it encrypted', async () => {
      const legacy = await legacyCookie('_session', SESSION);

      const { data, headers } = await sessionCookie.get(requestWith(legacy));

      expect(data).toMatchObject({ sub: 'user-123', accessToken: 'secret-access-token' });
      expect(headers.get('Set-Cookie')).not.toContain('secret-access-token');
      const reread = await sessionCookie.get(requestWith(cookiePair(headers)));
      expect(reread.data).toEqual({ ...data, refreshToken: null });
    });

    it('upgrade() returns an encrypted Set-Cookie for an old session cookie', async () => {
      const legacy = await legacyCookie('_session', SESSION);

      const upgraded = await sessionCookie.upgrade(requestWith(legacy));

      expect(upgraded).toMatch(/^_session=v1\./);
      const { data } = await sessionCookie.get(requestWith(upgraded!.split(';')[0]));
      expect(data).toMatchObject({ accessToken: 'secret-access-token' });
    });

    it('drops the refresh token when it re-issues an old session cookie', async () => {
      const legacy = await legacyCookie('_session', SESSION);

      const upgraded = await sessionCookie.upgrade(requestWith(legacy));
      const viaGet = (await sessionCookie.get(requestWith(legacy))).headers;

      for (const pair of [upgraded!.split(';')[0], cookiePair(viaGet)]) {
        const { data } = await sessionCookie.get(requestWith(pair));
        expect(data).toEqual({
          ...SESSION,
          expiredAt: SESSION.expiredAt.toISOString(),
          refreshToken: null,
        });
      }
    });

    it('still reports the old cookie as it was, refresh token included', async () => {
      const legacy = await legacyCookie('_session', SESSION);

      const { data } = await sessionCookie.get(requestWith(legacy));

      expect(data).toMatchObject({ refreshToken: 'secret-refresh-token' });
    });

    it('upgrade() re-issues an old token cookie too', async () => {
      const legacy = await legacyCookie('_token', { idToken: 'secret-id-token' });

      expect(await tokenCookie.upgrade(requestWith(legacy))).toMatch(/^_token=v1\./);
    });

    it('upgrade() leaves an encrypted, missing or forged cookie alone', async () => {
      const { headers } = await sessionCookie.set(requestWith(''), SESSION);
      const forged = (await legacyCookie('_session', SESSION)).replace(/.$/, 'x');

      expect(await sessionCookie.upgrade(requestWith(cookiePair(headers)))).toBeNull();
      expect(await sessionCookie.upgrade(requestWith(''))).toBeNull();
      expect(await sessionCookie.upgrade(requestWith(forged))).toBeNull();
    });
  });
});
