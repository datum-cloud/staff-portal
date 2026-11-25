import Logout, { clientLoader, headers, loader } from './logout';
import { buildEndSessionRequest } from '@/modules/auth/end-session.server';
import { sessionCookie, tokenCookie } from '@/utils/cookies';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/react/macro', () => ({ Trans: () => null }));
vi.mock('@/modules/auth/end-session.server', () => ({ buildEndSessionRequest: vi.fn() }));
vi.mock('@/utils/cookies', () => ({
  sessionCookie: { destroy: vi.fn() },
  tokenCookie: { get: vi.fn(), destroy: vi.fn() },
}));
vi.mock('@/utils/helpers', () => ({
  combineHeaders: (...all: HeadersInit[]) => {
    const merged = new Headers();
    all.forEach((init) => {
      const h = new Headers(init);
      h.forEach((value, name) => {
        if (name !== 'set-cookie') merged.set(name, value);
      });
      h.getSetCookie().forEach((value) => merged.append('Set-Cookie', value));
    });
    return merged;
  },
}));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }));

const STORAGE_KEY = 'datum:staff-chats';

type ClientLoaderArgs = Parameters<typeof clientLoader>[0];

function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

describe('logout clientLoader', () => {
  const assign = vi.fn();

  beforeEach(() => {
    assign.mockReset();
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.stubGlobal('window', { location: { assign } });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'chat-1', messages: [] }]));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Signing out from inside the app must reach the IdP's end_session with the
  // id token still in its cookie, so it loads /logout as a document instead of
  // fetching /logout.data (which clears the cookies before the browser leaves).
  it('clears stored transcripts, then loads /logout as a full document', () => {
    const storedAtAssign: Array<string | null> = [];
    assign.mockImplementation(() => storedAtAssign.push(localStorage.getItem(STORAGE_KEY)));
    const serverLoader = vi.fn();

    void clientLoader({ serverLoader } as unknown as ClientLoaderArgs);

    expect(assign).toHaveBeenCalledWith('/logout');
    expect(storedAtAssign).toEqual([null]);
    expect(serverLoader).not.toHaveBeenCalled();
  });
});

type LoaderArgs = Parameters<typeof loader>[0];
type LogoutProps = Parameters<typeof Logout>[0];

const END_SESSION = {
  action: 'https://auth.example.test/oidc/v1/end_session',
  fields: {
    id_token_hint: 'id-token',
    post_logout_redirect_uri: 'https://staff.example.test/login',
  },
};

const clearing = (name: string) =>
  new Headers({ 'Set-Cookie': `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax` });

/** Runs the loader and returns what it answers with, thrown or returned. */
async function runLoader(): Promise<unknown> {
  try {
    return await loader({
      request: new Request('http://localhost:3000/logout'),
    } as unknown as LoaderArgs);
  } catch (thrown) {
    return thrown;
  }
}

describe('logout loader', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(tokenCookie.get).mockResolvedValue({
      data: { idToken: 'id-token' },
      headers: new Headers(),
    } as never);
    vi.mocked(tokenCookie.destroy).mockResolvedValue({ headers: clearing('_token') } as never);
    vi.mocked(sessionCookie.destroy).mockResolvedValue({ headers: clearing('_session') } as never);
  });

  // The browser has to make the end_session request itself, and as a form POST
  // so the id token stays out of its history and the IdP's access logs.
  it('hands the page the end_session form, clearing both cookies uncached', async () => {
    vi.mocked(buildEndSessionRequest).mockReturnValue(END_SESSION);

    const result = (await runLoader()) as { data: unknown; init: { headers: Headers } };

    expect(buildEndSessionRequest).toHaveBeenCalledWith('id-token');
    expect(result.data).toEqual({ endSession: END_SESSION });
    const responseHeaders = new Headers(result.init.headers);
    expect(responseHeaders.get('Cache-Control')).toBe('no-store');
    expect(responseHeaders.getSetCookie()).toEqual([
      expect.stringMatching(/^_token=; Max-Age=0/),
      expect.stringMatching(/^_session=; Max-Age=0/),
    ]);
  });

  it('redirects to /login when there is no id token to end the IdP session with', async () => {
    vi.mocked(tokenCookie.get).mockResolvedValue({
      data: undefined,
      headers: new Headers(),
    } as never);
    vi.mocked(buildEndSessionRequest).mockReturnValue(null);

    const response = (await runLoader()) as Response;

    expect(buildEndSessionRequest).toHaveBeenCalledWith(undefined);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login');
    expect(response.headers.getSetCookie()).toHaveLength(2);
  });

  // Document responses only carry loader headers that the route passes on.
  it('passes the loader headers on to the document response', () => {
    const loaderHeaders = new Headers({ 'Cache-Control': 'no-store' });

    expect(headers({ loaderHeaders } as never)).toBe(loaderHeaders);
  });
});

describe('Logout page', () => {
  it('renders a hidden form that posts every field to end_session', () => {
    const markup = renderToStaticMarkup(
      createElement(Logout, { loaderData: { endSession: END_SESSION } } as unknown as LogoutProps)
    );

    expect(markup).toContain('method="post"');
    expect(markup).toContain(`action="${END_SESSION.action}"`);
    expect(markup).toContain('name="id_token_hint" value="id-token"');
    expect(markup).toContain(
      'name="post_logout_redirect_uri" value="https://staff.example.test/login"'
    );
    expect(markup).not.toContain('?id_token_hint');
  });
});
