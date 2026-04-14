import { useQuery } from '@tanstack/react-query';

interface UseResourceCountOptions {
  queryKey: readonly unknown[];
  /** Async function that calls a list API with limit=1 and returns the list response object */
  queryFn: () => Promise<
    | {
        items?: unknown[];
        metadata?: { remainingItemCount?: number };
      }
    | null
    | undefined
  >;
}

interface UseResourceCountResult {
  count: number | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useResourceCount(options: UseResourceCountOptions): UseResourceCountResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: options.queryKey,
    queryFn: async () => {
      const result = await options.queryFn();
      const items = result?.items ?? [];
      if (items.length === 0) return 0;
      return 1 + (result?.metadata?.remainingItemCount ?? 0);
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    count: isLoading || isError ? undefined : (data as number | undefined),
    isLoading,
    isError,
  };
}
