import { usePendingApprovalsWidget } from './use-pending-approvals-widget';
import * as client from '@/resources/request/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/resources/request/client', () => ({
  userListQuery: vi.fn(),
}));

const mockUserListQuery = vi.mocked(client.userListQuery);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

function makeUser(overrides: {
  name: string;
  email?: string;
  givenName?: string;
  familyName?: string;
  creationTimestamp?: string;
}) {
  return {
    metadata: {
      name: overrides.name,
      creationTimestamp: overrides.creationTimestamp ?? '2025-01-01T00:00:00Z',
    },
    spec: {
      email: overrides.email ?? 'user@example.com',
      givenName: overrides.givenName ?? '',
      familyName: overrides.familyName ?? '',
    },
  };
}

describe('usePendingApprovalsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('query parameters', () => {
    test('calls userListQuery with registrationApproval=Pending and limit=5', async () => {
      mockUserListQuery.mockResolvedValue({ items: [] } as any);

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockUserListQuery).toHaveBeenCalledWith({
        filters: { registrationApproval: 'Pending' },
        limit: 5,
      });
    });

    test('exposes a refetch function (confirming refetchInterval option is set)', async () => {
      mockUserListQuery.mockResolvedValue({ items: [] } as any);

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('row mapping', () => {
    test('maps user fields to PendingApprovalRow correctly', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [
          makeUser({
            name: 'user-abc',
            email: 'alice@example.com',
            givenName: 'Alice',
            familyName: 'Smith',
            creationTimestamp: '2025-04-01T08:00:00Z',
          }),
        ],
      } as any);

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.approvals[0]).toEqual({
        name: 'user-abc',
        email: 'alice@example.com',
        givenName: 'Alice',
        familyName: 'Smith',
        creationTimestamp: '2025-04-01T08:00:00Z',
      });
    });

    test('defaults missing spec fields to empty strings', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [
          {
            metadata: { name: 'bare-user', creationTimestamp: '2025-01-01T00:00:00Z' },
            spec: {},
          },
        ],
      } as any);

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.approvals[0]).toEqual({
        name: 'bare-user',
        email: '',
        givenName: '',
        familyName: '',
        creationTimestamp: '2025-01-01T00:00:00Z',
      });
    });
  });

  describe('totalCount computation', () => {
    test('returns 0 when items array is empty', async () => {
      mockUserListQuery.mockResolvedValue({ items: [] } as any);

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.totalCount).toBe(0);
    });

    test('returns items.length + remainingItemCount when there are items with remaining', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [makeUser({ name: 'user-1' })],
        metadata: { remainingItemCount: 4 },
      } as any);

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.totalCount).toBe(5);
    });

    test('returns items.length when remainingItemCount is undefined', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [makeUser({ name: 'user-1' })],
        metadata: {},
      } as any);

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.totalCount).toBe(1);
    });

    test('3 items with remainingItemCount=0 returns totalCount=3', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [
          makeUser({ name: 'user-1' }),
          makeUser({ name: 'user-2' }),
          makeUser({ name: 'user-3' }),
        ],
        metadata: { remainingItemCount: 0 },
      } as any);

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.totalCount).toBe(3);
    });

    test('3 items with remainingItemCount=7 returns totalCount=10', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [
          makeUser({ name: 'user-1' }),
          makeUser({ name: 'user-2' }),
          makeUser({ name: 'user-3' }),
        ],
        metadata: { remainingItemCount: 7 },
      } as any);

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.totalCount).toBe(10);
    });

    test('5 items (full page) with remainingItemCount=2 returns totalCount=7', async () => {
      mockUserListQuery.mockResolvedValue({
        items: [
          makeUser({ name: 'user-1' }),
          makeUser({ name: 'user-2' }),
          makeUser({ name: 'user-3' }),
          makeUser({ name: 'user-4' }),
          makeUser({ name: 'user-5' }),
        ],
        metadata: { remainingItemCount: 2 },
      } as any);

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.totalCount).toBe(7);
    });
  });

  describe('loading and error states', () => {
    test('returns isLoading=true and empty approvals while pending', () => {
      mockUserListQuery.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.approvals).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });

    test('returns isError=true on API failure', async () => {
      mockUserListQuery.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isError).toBe(true);
      expect(result.current.approvals).toEqual([]);
    });

    test('handles null response gracefully', async () => {
      mockUserListQuery.mockResolvedValue(null as any);

      const { result } = renderHook(() => usePendingApprovalsWidget(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.approvals).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });
  });
});
