import { mapApiError } from '@/utils/errors/error-mapper';
import { QueryClient } from '@tanstack/react-query';

/**
 * Retries server and network failures only. A 4xx (an expired cursor, a
 * validation failure, a missing resource) is an expected answer that retrying
 * cannot change, and re-running a cursor walk three more times is expensive.
 *
 * Errors are normalised through `mapApiError` because the two transports throw
 * different shapes: GraphQL throws an `AppError`, while the generated openapi
 * client throws an `AxiosError` whose status lives on `response.status`.
 */
export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  const { statusCode } = mapApiError(error);
  if (statusCode >= 400 && statusCode < 500) {
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
