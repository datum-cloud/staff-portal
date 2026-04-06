import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, test, expect } from 'vitest';
import { useResourceCount } from './use-resource-count';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useResourceCount', () => {
  describe('count computation', () => {
    test('returns 0 when items array is empty', async () => {
      const { result } = renderHook(
        () =>
          useResourceCount({
            queryKey: ['test', 'empty'],
            queryFn: async () => ({ items: [], metadata: { remainingItemCount: 0 } }),
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.count).toBe(0);
      expect(result.current.isError).toBe(false);
    });

    test('returns 1 + remainingItemCount when items has entries and remainingItemCount is defined', async () => {
      const { result } = renderHook(
        () =>
          useResourceCount({
            queryKey: ['test', 'with-remaining'],
            queryFn: async () => ({ items: [{}], metadata: { remainingItemCount: 41 } }),
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.count).toBe(42);
    });

    test('returns 1 when items has one entry and remainingItemCount is undefined', async () => {
      const { result } = renderHook(
        () =>
          useResourceCount({
            queryKey: ['test', 'one-item-no-remaining'],
            queryFn: async () => ({ items: [{}], metadata: {} }),
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.count).toBe(1);
    });

    test('returns 1 when items has one entry and remainingItemCount is 0', async () => {
      const { result } = renderHook(
        () =>
          useResourceCount({
            queryKey: ['test', 'one-item-zero-remaining'],
            queryFn: async () => ({ items: [{}], metadata: { remainingItemCount: 0 } }),
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.count).toBe(1);
    });

    test('handles null response as 0', async () => {
      const { result } = renderHook(
        () =>
          useResourceCount({
            queryKey: ['test', 'null'],
            queryFn: async () => null,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.count).toBe(0);
    });

    test('handles undefined response as 0', async () => {
      const { result } = renderHook(
        () =>
          useResourceCount({
            queryKey: ['test', 'undefined'],
            queryFn: async () => undefined,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.count).toBe(0);
    });
  });

  describe('loading state', () => {
    test('returns undefined count while loading', () => {
      const { result } = renderHook(
        () =>
          useResourceCount({
            queryKey: ['test', 'loading'],
            queryFn: () => new Promise(() => {}),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.count).toBeUndefined();
    });
  });

  describe('error state', () => {
    test('returns undefined count and isError=true when queryFn rejects', async () => {
      const { result } = renderHook(
        () =>
          useResourceCount({
            queryKey: ['test', 'error'],
            queryFn: async () => {
              throw new Error('API failure');
            },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isError).toBe(true);
      expect(result.current.count).toBeUndefined();
    });
  });
});
