import { mapApiError } from '@/utils/errors/error-mapper';
import { QueryClient } from '@tanstack/react-query';

/** How many times a query may retry before the failure reaches the caller. */
const MAX_QUERY_RETRIES = 3;

/**
 * The 4xx statuses that are still worth retrying: the request timed out (408)
 * or was rate limited (429), so the same request can succeed later.
 */
const RETRYABLE_CLIENT_STATUSES = new Set([408, 429]);

/**
 * Retries server and network failures only. Most 4xx responses (an expired
 * cursor, a validation failure, a missing resource) are expected answers that
 * retrying cannot change, and re-running a cursor walk three more times is
 * expensive. 408 and 429 are the exceptions: a timeout or a rate limit can
 * clear on its own, so they retry like a 5xx.
 *
 * Errors are normalised through `mapApiError` because the two transports throw
 * different shapes: GraphQL throws an `AppError`, while the generated openapi
 * client throws an `AxiosError` whose status lives on `response.status`.
 */
export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  const { statusCode } = mapApiError(error);
  const isClientError = statusCode >= 400 && statusCode < 500;
  if (isClientError && !RETRYABLE_CLIENT_STATUSES.has(statusCode)) {
    return false;
  }
  return failureCount < MAX_QUERY_RETRIES;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
    },
  },
});
