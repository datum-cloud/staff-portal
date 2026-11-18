import { loader } from './callback';
import { authenticator } from '@/modules/auth';
import logger from '@/utils/logger';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/react/macro', () => ({ Trans: () => null }));
vi.mock('@/modules/auth', () => ({ authenticator: { authenticate: vi.fn() } }));
vi.mock('@/utils/cookies', () => ({
  getRedirectDestination: vi.fn(),
  redirectToCookie: { parse: vi.fn(), serialize: vi.fn() },
  sessionCookie: { set: vi.fn() },
  tokenCookie: { set: vi.fn() },
}));
vi.mock('@/utils/helpers', () => ({ combineHeaders: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }));

type LoaderArgs = Parameters<typeof loader>[0];

const COOKIE = '_session=secret-session-value; _token=secret-id-token';

describe('callback loader', () => {
  it('logs a failed callback without the Cookie header or the authorization code', async () => {
    vi.mocked(authenticator.authenticate).mockRejectedValue(new Error('token exchange failed'));
    const request = new Request('http://localhost:3000/auth/callback?code=one-time-code&state=s1', {
      headers: { Cookie: COOKIE },
    });
    const context = { get: () => 'req-1' };

    const response = (await loader({ request, context } as unknown as LoaderArgs)) as Response;

    expect(response.headers.get('Location')).toContain('error=oauth_failed');
    expect(logger.error).toHaveBeenCalledOnce();
    const logged = JSON.stringify(vi.mocked(logger.error).mock.calls[0]);
    expect(logged).not.toContain('secret-session-value');
    expect(logged).not.toContain('secret-id-token');
    expect(logged).not.toContain('one-time-code');
    expect(logged).toContain('http://localhost:3000/auth/callback');
  });
});
