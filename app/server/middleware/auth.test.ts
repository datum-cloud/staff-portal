import { authMiddleware, clearStaffMembershipCache, getToken, STAFF_MEMBERSHIP_TTL_MS } from './auth';
import { authenticator } from '@/modules/auth';
import { isStaffMember } from '@/modules/auth/require-staff.server';
import { EnvVariables } from '@/server/iface';
import { env } from '@/utils/config/env.server';
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TOKEN = 'access-token';
const USER_ID = 'user-123';

vi.mock('@/modules/auth', () => ({
  authenticator: { isAuthenticated: vi.fn(), getSession: vi.fn() },
}));
vi.mock('@/modules/auth/require-staff.server', () => ({ isStaffMember: vi.fn() }));
vi.mock('@/server/logger', () => ({ logApiError: vi.fn() }));
vi.mock('@/utils/config/env.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/config/env.server')>();
  return { ...actual, env: { ...actual.env } };
});

const isAuthenticated = vi.mocked(authenticator.isAuthenticated);
const getSession = vi.mocked(authenticator.getSession);
const staffMember = vi.mocked(isStaffMember);

function createApp() {
  const app = new Hono<{ Variables: EnvVariables }>();
  app.use(requestId());
  app.get('/api/thing', authMiddleware(), (c) => c.json({ token: getToken(c) }));
  return app;
}

const signIn = (accessToken = TOKEN) =>
  getSession.mockResolvedValue({ accessToken, sub: USER_ID } as never);

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearStaffMembershipCache();
    env.isCypress = false;
    isAuthenticated.mockResolvedValue(true);
    signIn();
    staffMember.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lets a staff user through with the session token', async () => {
    const res = await createApp().request('/api/thing');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ token: TOKEN });
    expect(staffMember).toHaveBeenCalledWith(TOKEN, USER_ID);
  });

  it('answers 403 JSON for a signed-in user outside the staff group', async () => {
    staffMember.mockResolvedValue(false);

    const res = await createApp().request('/api/thing');

    expect(res.status).toBe(403);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(await res.json()).toMatchObject({ code: 'FORBIDDEN', path: '/api/thing' });
  });

  it('answers 401 without a membership lookup when nobody is signed in', async () => {
    isAuthenticated.mockResolvedValue(false);

    const res = await createApp().request('/api/thing');

    expect(res.status).toBe(401);
    expect(staffMember).not.toHaveBeenCalled();
  });

  it('reuses a cached decision instead of looking membership up again', async () => {
    const app = createApp();

    await app.request('/api/thing');
    const res = await app.request('/api/thing');

    expect(res.status).toBe(200);
    expect(staffMember).toHaveBeenCalledOnce();
  });

  it('caches a non-staff decision too', async () => {
    staffMember.mockResolvedValue(false);
    const app = createApp();

    await app.request('/api/thing');
    const res = await app.request('/api/thing');

    expect(res.status).toBe(403);
    expect(staffMember).toHaveBeenCalledOnce();
  });

  it('looks membership up again once the cached decision expires', async () => {
    vi.useFakeTimers();
    const app = createApp();

    await app.request('/api/thing');
    vi.advanceTimersByTime(STAFF_MEMBERSHIP_TTL_MS + 1);
    await app.request('/api/thing');

    expect(staffMember).toHaveBeenCalledTimes(2);
  });

  it('keeps a separate decision for each session', async () => {
    const app = createApp();

    await app.request('/api/thing');
    signIn('other-token');
    await app.request('/api/thing');

    expect(staffMember).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed lookup', async () => {
    staffMember.mockRejectedValueOnce(new Error('socket hang up'));
    const app = createApp();

    const failed = await app.request('/api/thing');
    const retried = await app.request('/api/thing');

    expect(failed.status).toBe(500);
    expect(retried.status).toBe(200);
    expect(staffMember).toHaveBeenCalledTimes(2);
  });

  it('skips the staff check under Cypress', async () => {
    env.isCypress = true;

    const res = await createApp().request('/api/thing');

    expect(res.status).toBe(200);
    expect(staffMember).not.toHaveBeenCalled();
  });
});
