import { AuthenticationError, AuthorizationError } from './auth';
import { AppError } from './base';
import { CursorExpiredError, UpstreamError, UpstreamTimeoutError } from './gateway';
import { NotFoundError, ConflictError, ValidationError, HttpError } from './http';
import { isGqlError, getGqlErrorCode, getGqlErrorMessage } from '@/modules/graphql/errors';
import { CombinedError } from '@urql/core';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  message?: string;
  code?: string;
  details?: Array<{ path: string[]; message: string }>;
}

/** Reads the upstream HTTP status the gateway puts on `extensions.status`. */
function readUpstreamStatus(value: unknown): number | undefined {
  const status = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof status !== 'number' || !Number.isInteger(status)) return undefined;
  return status >= 400 && status <= 599 ? status : undefined;
}

/** Maps a gateway error code onto the same `AppError` for every transport. */
function mapGatewayCode(
  code: string | undefined,
  message: string,
  extensions?: { [key: string]: unknown },
  requestId?: string
): AppError {
  switch (code) {
    case 'UNAUTHENTICATED':
      return new AuthenticationError(message, requestId);
    case 'FORBIDDEN':
      return new AuthorizationError(message, requestId);
    case 'NOT_FOUND':
      return new NotFoundError(message, requestId);
    case 'BAD_USER_INPUT':
      return new ValidationError(message, requestId);
    case 'UPSTREAM_TIMEOUT':
      return new UpstreamTimeoutError(message, requestId);
    case 'UPSTREAM_ERROR':
      return new UpstreamError(message, readUpstreamStatus(extensions?.status), requestId);
    case 'CURSOR_EXPIRED':
      return new CursorExpiredError(message, requestId);
    default:
      return new AppError(message, 500, code ?? 'GRAPHQL_ERROR', requestId);
  }
}

export function mapApiError(error: unknown, requestId?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 500;
    const data = error.response?.data as ApiErrorResponse | undefined;
    const message = data?.message ?? error.message ?? 'An error occurred';

    switch (status) {
      case 400:
        return new ValidationError(message, requestId);
      case 401:
        return new AuthenticationError(message, requestId);
      case 403:
        return new AuthorizationError(message, requestId);
      case 404:
        return new NotFoundError(message, requestId);
      case 409:
        return new ConflictError(message, requestId);
      default:
        return new HttpError(message, status, requestId);
    }
  }

  // Handle GraphQL errors (legacy gqlts-style response objects)
  if (isGqlError(error)) {
    const gqlError = error.errors![0];
    return mapGatewayCode(
      getGqlErrorCode(gqlError),
      getGqlErrorMessage(error),
      gqlError.extensions,
      requestId
    );
  }

  // Handle URQL CombinedError
  if (error instanceof CombinedError) {
    const gqlError = error.graphQLErrors[0];
    return mapGatewayCode(
      gqlError?.extensions?.code as string | undefined,
      gqlError?.message ?? error.message,
      gqlError?.extensions,
      requestId
    );
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, 'INTERNAL_ERROR', requestId);
  }

  return new AppError('An unexpected error occurred', 500, 'UNKNOWN_ERROR', requestId);
}
