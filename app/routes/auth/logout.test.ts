import { clientLoader } from './logout';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lingui/react/macro', () => ({ Trans: () => null }));
vi.mock('@/modules/auth', () => ({ authenticator: { logout: vi.fn() } }));
vi.mock('@/utils/cookies', () => ({ sessionCookie: {}, tokenCookie: {} }));
vi.mock('@/utils/helpers', () => ({ combineHeaders: vi.fn() }));
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
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'chat-1', messages: [] }]));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears stored transcripts before the server signs the user out', async () => {
    const storedAtServerCall: Array<string | null> = [];
    const serverLoader = vi.fn(async () => {
      storedAtServerCall.push(localStorage.getItem(STORAGE_KEY));
      return null;
    });

    await clientLoader({ serverLoader } as unknown as ClientLoaderArgs);

    expect(serverLoader).toHaveBeenCalledOnce();
    expect(storedAtServerCall).toEqual([null]);
  });

  it('still clears transcripts when the server loader redirects by throwing', async () => {
    const redirect = new Response(null, { status: 302, headers: { Location: '/login' } });
    const serverLoader = vi.fn(async () => {
      throw redirect;
    });

    await expect(clientLoader({ serverLoader } as unknown as ClientLoaderArgs)).rejects.toBe(
      redirect
    );

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
