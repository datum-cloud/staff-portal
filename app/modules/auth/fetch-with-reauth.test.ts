import { fetchWithReauth } from './fetch-with-reauth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const location = { pathname: '/customers/users', search: '?tab=all', href: '' };

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('fetchWithReauth', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    location.href = '';
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { location });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Same rule as the axios client: the API answers a dead session with
  // 401 AUTH_ERROR, and only a fresh login recovers it.
  it('sends the browser to re-auth on a 401 AUTH_ERROR, returning to this page', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { code: 'AUTH_ERROR' }));

    const response = await fetchWithReauth('/api/graphql', { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledWith('/api/graphql', { method: 'POST' });
    expect(response.status).toBe(401);
    expect(location.href).toBe(
      `/auth/reauth?redirectTo=${encodeURIComponent('/customers/users?tab=all')}`
    );
  });

  it('leaves the caller to read the body after the check', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { code: 'AUTH_ERROR', error: 'expired' }));

    const response = await fetchWithReauth('/api/usage');

    expect(await response.json()).toMatchObject({ error: 'expired' });
  });

  it.each([
    ['a 401 with another code', jsonResponse(401, { code: 'SOMETHING_ELSE' })],
    ['a 401 without a JSON body', new Response('nope', { status: 401 })],
    ['a 403', jsonResponse(403, { code: 'FORBIDDEN' })],
    ['a success', jsonResponse(200, { data: {} })],
  ])('does not redirect on %s', async (_case, response) => {
    fetchMock.mockResolvedValue(response);

    const result = await fetchWithReauth('/api/usage');

    expect(result).toBe(response);
    expect(location.href).toBe('');
  });
});
