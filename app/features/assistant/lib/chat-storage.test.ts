import type { StoredChat } from '../types';
import { clearChats, listChats, saveChat } from './chat-storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'datum:staff-chats';

function createMemoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

function createChat(id: string): StoredChat {
  return {
    id,
    title: 'Customer lookup',
    messages: [
      { id: 'msg-1', role: 'user', parts: [{ type: 'text', text: 'Find jane@example.com' }] },
    ],
    createdAt: 1,
    updatedAt: 2,
  };
}

describe('clearChats', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes every stored chat', () => {
    saveChat(createChat('chat-1'));
    saveChat(createChat('chat-2'));
    expect(listChats()).toHaveLength(2);

    clearChats();

    expect(listChats()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('leaves other keys in place', () => {
    localStorage.setItem('staff-assistant-dock', 'right');
    saveChat(createChat('chat-1'));

    clearChats();

    expect(localStorage.getItem('staff-assistant-dock')).toBe('right');
  });

  it('does not throw when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      ...createMemoryStorage(),
      removeItem: () => {
        throw new Error('storage disabled');
      },
    });

    expect(() => clearChats()).not.toThrow();
  });
});
