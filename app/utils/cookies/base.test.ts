import { sessionCookie } from './session';
import { tokenCookie } from './token';
import { createCookie, createCookieSessionStorage } from 'react-router';
import { describe, expect, it } from 'vitest';

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

describe('BaseCookie', () => {
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

  describe('old signed-only cookies', () => {
    it('still reads one and re-issues it encrypted', async () => {
      const legacy = await legacyCookie('_session', SESSION);

      const { data, headers } = await sessionCookie.get(requestWith(legacy));

      expect(data).toMatchObject({ sub: 'user-123', accessToken: 'secret-access-token' });
      expect(headers.get('Set-Cookie')).not.toContain('secret-access-token');
      const reread = await sessionCookie.get(requestWith(cookiePair(headers)));
      expect(reread.data).toEqual(data);
    });

    it('upgrade() returns an encrypted Set-Cookie for an old session cookie', async () => {
      const legacy = await legacyCookie('_session', SESSION);

      const upgraded = await sessionCookie.upgrade(requestWith(legacy));

      expect(upgraded).toMatch(/^_session=v1\./);
      const { data } = await sessionCookie.get(requestWith(upgraded!.split(';')[0]));
      expect(data).toMatchObject({ accessToken: 'secret-access-token' });
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
