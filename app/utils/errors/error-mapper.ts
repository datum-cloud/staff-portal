import { AuthenticationError, AuthorizationError } from './auth';
import { AppError } from './base';
import { NotFoundError, ConflictError, ValidationError, HttpError } from './http';
import { isGqlError, getGqlErrorCode, getGqlErrorMessage } from '@/modules/graphql/errors';
import { CombinedError } from '@urql/core';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  message?: string;
  code?: string;
  details?: Array<{ path: string[]; message: string }>;
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
    const code = getGqlErrorCode(gqlError);
    const message = getGqlErrorMessage(error);

    switch (code) {
      case 'UNAUTHENTICATED':
        return new AuthenticationError(message, requestId);
      case 'FORBIDDEN':
        return new AuthorizationError(message, requestId);
      case 'NOT_FOUND':
        return new NotFoundError(message, requestId);
      case 'BAD_USER_INPUT':
        return new ValidationError(message, requestId);
      default:
        return new AppError(message, 500, code ?? 'GRAPHQL_ERROR', requestId);
    }
  }

  // Handle URQL CombinedError
  if (error instanceof CombinedError) {
    const gqlError = error.graphQLErrors[0];
    const code = gqlError?.extensions?.code as string | undefined;
    const message = gqlError?.message ?? error.message;

    switch (code) {
      case 'UNAUTHENTICATED':
        return new AuthenticationError(message, requestId);
      case 'FORBIDDEN':
        return new AuthorizationError(message, requestId);
      case 'NOT_FOUND':
        return new NotFoundError(message, requestId);
      case 'BAD_USER_INPUT':
        return new ValidationError(message, requestId);
      default:
        return new AppError(message, 500, code ?? 'GRAPHQL_ERROR', requestId);
    }
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, 'INTERNAL_ERROR', requestId);
  }

  return new AppError('An unexpected error occurred', 500, 'UNKNOWN_ERROR', requestId);
}
