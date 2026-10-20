import { AppError } from '@/utils/errors';
import { QueryClient } from '@tanstack/react-query';

/**
 * Retries server and network failures only. A 4xx `AppError` (an expired
 * cursor, a validation failure, a missing resource) is an expected answer that
 * retrying cannot change, and re-running a cursor walk three more times is
 * expensive.
 */
export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  if (error instanceof AppError && error.statusCode >= 400 && error.statusCode < 500) {
    return false;
  }
  return failureCount < 3;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
    },
  },
});
