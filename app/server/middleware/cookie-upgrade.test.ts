import { cookieUpgradeMiddleware } from './cookie-upgrade';
import { sessionCookie } from '@/utils/cookies';
import { Hono } from 'hono';
import { createCookie, createCookieSessionStorage } from 'react-router';
import { describe, expect, it } from 'vitest';

const SECRET = 'test-session-secret-at-least-32-chars'; // vitest.config.ts SESSION_SECRET

async function legacySessionCookie(): Promise<string> {
  const cookie = createCookie('_session', { path: '/', httpOnly: true, secrets: [SECRET] });
  const storage = createCookieSessionStorage({ cookie });
  const session = await storage.getSession();
  session.set('_session', { sub: 'user-123', accessToken: 'secret-access-token' });
  return (await storage.commitSession(session)).split(';')[0];
}

function createApp() {
  const app = new Hono();
  app.use(cookieUpgradeMiddleware());
  app.get('/page', (c) => c.text('ok'));
  app.get('/redirect', () => Response.redirect('http://localhost:3000/page', 302));
  app.get('/sign-in', async (c) => {
    const { headers } = await sessionCookie.set(c.req.raw, { sub: 'fresh' } as never);
    return c.text('signed in', 200, { 'Set-Cookie': headers.get('Set-Cookie')! });
  });
  return app;
}

describe('cookieUpgradeMiddleware', () => {
  it('re-issues an old signed-only session cookie encrypted', async () => {
    const res = await createApp().request('/page', {
      headers: { Cookie: await legacySessionCookie() },
    });

    const setCookies = res.headers.getSetCookie();
    expect(res.status).toBe(200);
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]).toMatch(/^_session=v1\./);
    expect(setCookies[0]).not.toContain('secret-access-token');
  });

  it('adds the cookie to a response whose headers are immutable', async () => {
    const res = await createApp().request('/redirect', {
      headers: { Cookie: await legacySessionCookie() },
    });

    expect(res.status).toBe(302);
    expect(res.headers.getSetCookie()[0]).toMatch(/^_session=v1\./);
  });

  it('leaves a response alone when the cookie is already encrypted', async () => {
    const { headers } = await sessionCookie.set(new Request('http://localhost:3000/'), {
      sub: 'user-123',
    } as never);

    const res = await createApp().request('/page', {
      headers: { Cookie: headers.get('Set-Cookie')!.split(';')[0] },
    });

    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it('does not override a session cookie the response already sets', async () => {
    const res = await createApp().request('/sign-in', {
      headers: { Cookie: await legacySessionCookie() },
    });

    expect(res.headers.getSetCookie()).toHaveLength(1);
  });
});
