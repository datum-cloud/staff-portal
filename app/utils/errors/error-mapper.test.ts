import { mapApiError } from './error-mapper';
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  CursorExpiredError,
  HttpError,
  NotFoundError,
  UpstreamError,
  UpstreamTimeoutError,
  ValidationError,
} from '@/utils/errors';
import { CombinedError } from '@urql/core';
import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

const REQUEST_ID = 'req-42';

/** An Axios error for a response with `status`, optionally carrying an API body. */
function axiosError(status: number, data?: unknown, message = 'Request failed') {
  const response = { status, data } as AxiosResponse;
  return new AxiosError(message, 'ERR_BAD_RESPONSE', undefined, undefined, response);
}

/** A legacy gqlts-style response object, which `isGqlError` matches. */
function gqltsError(code: string | undefined, message: string, extra: object = {}) {
  return { errors: [{ message, extensions: { ...(code ? { code } : {}), ...extra } }] };
}

/** A urql CombinedError carrying the same GraphQL error. */
function urqlError(code: string | undefined, message: string, extra: object = {}) {
  return new CombinedError({
    graphQLErrors: [{ message, extensions: { ...(code ? { code } : {}), ...extra } }],
  });
}

// Both GraphQL transports must map a gateway code onto the same error.
const transports = [
  ['gqlts-style response', gqltsError],
  ['urql CombinedError', urqlError],
] as const;

describe('mapApiError', () => {
  it('returns an AppError unchanged', () => {
    const original = new NotFoundError('gone', 'req-original');

    expect(mapApiError(original, REQUEST_ID)).toBe(original);
  });

  describe('Axios errors', () => {
    it.each([
      [400, ValidationError, 422, 'VALIDATION_ERROR'],
      [401, AuthenticationError, 401, 'AUTH_ERROR'],
      [403, AuthorizationError, 403, 'FORBIDDEN'],
      [404, NotFoundError, 404, 'NOT_FOUND'],
      [409, ConflictError, 409, 'CONFLICT'],
    ] as const)('maps HTTP %i to its typed error', (status, ErrorClass, statusCode, code) => {
      const error = mapApiError(axiosError(status, { message: 'from the API' }), REQUEST_ID);

      expect(error).toBeInstanceOf(ErrorClass);
      expect(error.statusCode).toBe(statusCode);
      expect(error.code).toBe(code);
      expect(error.message).toBe('from the API');
      expect(error.requestId).toBe(REQUEST_ID);
    });

    it.each([422, 429, 500, 503])('keeps HTTP %i on a generic HttpError', (status) => {
      const error = mapApiError(axiosError(status, { message: 'from the API' }), REQUEST_ID);

      expect(error).toBeInstanceOf(HttpError);
      expect(error.statusCode).toBe(status);
      expect(error.code).toBe('HTTP_ERROR');
      expect(error.requestId).toBe(REQUEST_ID);
    });

    it('falls back to the Axios message when the body has none', () => {
      const error = mapApiError(axiosError(404, {}, 'Request failed with status code 404'));

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Request failed with status code 404');
    });

    it('treats an error without a response as a 500', () => {
      const error = mapApiError(new AxiosError('Network Error', 'ERR_NETWORK'), REQUEST_ID);

      expect(error).toBeInstanceOf(HttpError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Network Error');
    });

    it('marks 4xx as expected warnings and 5xx as unexpected errors', () => {
      const notFound = mapApiError(axiosError(404));
      const unavailable = mapApiError(axiosError(503));

      expect([notFound.expected, notFound.level]).toEqual([true, 'warning']);
      expect([unavailable.expected, unavailable.level]).toEqual([false, 'error']);
    });
  });

  describe.each(transports)('gateway codes from a %s', (_transport, makeError) => {
    it.each([
      ['UNAUTHENTICATED', AuthenticationError, 401, 'AUTH_ERROR'],
      ['FORBIDDEN', AuthorizationError, 403, 'FORBIDDEN'],
      ['NOT_FOUND', NotFoundError, 404, 'NOT_FOUND'],
      ['BAD_USER_INPUT', ValidationError, 422, 'VALIDATION_ERROR'],
      ['CURSOR_EXPIRED', CursorExpiredError, 410, 'CURSOR_EXPIRED'],
    ] as const)('maps %s to its typed error', (gatewayCode, ErrorClass, statusCode, code) => {
      const error = mapApiError(makeError(gatewayCode, 'from the gateway'), REQUEST_ID);

      expect(error).toBeInstanceOf(ErrorClass);
      expect(error.statusCode).toBe(statusCode);
      expect(error.code).toBe(code);
      expect(error.message).toBe('from the gateway');
      expect(error.requestId).toBe(REQUEST_ID);
    });

    it('maps UPSTREAM_TIMEOUT to a 504 and keeps a message that names the timeout', () => {
      const error = mapApiError(
        makeError('UPSTREAM_TIMEOUT', 'upstream request timed out after 10s'),
        REQUEST_ID
      );

      expect(error).toBeInstanceOf(UpstreamTimeoutError);
      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('UPSTREAM_TIMEOUT');
      expect(error.message).toBe('upstream request timed out after 10s');
      expect(error.requestId).toBe(REQUEST_ID);
    });

    it('says the request timed out when the gateway message does not', () => {
      const error = mapApiError(makeError('UPSTREAM_TIMEOUT', 'deadline exceeded'));

      expect(error.message).not.toBe('deadline exceeded');
      expect(error.message).toMatch(/timed out/i);
    });

    it('maps UPSTREAM_ERROR to a 502 carrying the upstream status', () => {
      const error = mapApiError(
        makeError('UPSTREAM_ERROR', 'upstream returned 503', { status: 503 }),
        REQUEST_ID
      );

      expect(error).toBeInstanceOf(UpstreamError);
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('UPSTREAM_ERROR');
      expect((error as UpstreamError).upstreamStatus).toBe(503);
      expect(error.requestId).toBe(REQUEST_ID);
    });

    it.each([
      ['a numeric string', '503', 503],
      ['a padded numeric string', ' 404 ', 404],
      ['the lowest error status', 400, 400],
      ['the highest error status', 599, 599],
    ])('reads an upstream status given as %s', (_case, status, expected) => {
      const error = mapApiError(makeError('UPSTREAM_ERROR', 'upstream failed', { status }));

      expect((error as UpstreamError).upstreamStatus).toBe(expected);
    });

    it.each([
      undefined,
      null,
      0,
      -1,
      200,
      399,
      600,
      200.5,
      '',
      '  ',
      '0',
      '503.5',
      'nope',
      true,
      { code: 503 },
    ])('ignores the upstream status %j', (status) => {
      const error = mapApiError(makeError('UPSTREAM_ERROR', 'upstream failed', { status }));

      expect(error.statusCode).toBe(502);
      expect((error as UpstreamError).upstreamStatus).toBeUndefined();
    });

    it('keeps an unknown code on a generic 500', () => {
      const error = mapApiError(makeError('SOMETHING_NEW', 'unexpected'), REQUEST_ID);

      expect(error.constructor).toBe(AppError);
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SOMETHING_NEW');
      expect(error.message).toBe('unexpected');
      expect(error.requestId).toBe(REQUEST_ID);
    });

    it('labels an error without a code GRAPHQL_ERROR', () => {
      const error = mapApiError(makeError(undefined, 'no code'));

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('GRAPHQL_ERROR');
    });
  });

  it('maps a gqlts response on its first error only', () => {
    const error = mapApiError({
      errors: [
        { message: 'first', extensions: { code: 'NOT_FOUND' } },
        { message: 'second', extensions: { code: 'FORBIDDEN' } },
      ],
    });

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe('first');
  });

  it('maps a gqlts error without extensions to a generic 500', () => {
    const error = mapApiError({ errors: [{ message: 'bare' }] });

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('GRAPHQL_ERROR');
    expect(error.message).toBe('bare');
  });

  it('maps a urql network error to a generic 500 with the combined message', () => {
    const error = mapApiError(
      new CombinedError({ networkError: new Error('Failed to fetch') }),
      REQUEST_ID
    );

    expect(error.constructor).toBe(AppError);
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('GRAPHQL_ERROR');
    expect(error.message).toBe('[Network] Failed to fetch');
    expect(error.requestId).toBe(REQUEST_ID);
  });

  describe('fallbacks', () => {
    it('wraps a plain Error as INTERNAL_ERROR', () => {
      const error = mapApiError(new TypeError('boom'), REQUEST_ID);

      expect(error.constructor).toBe(AppError);
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('boom');
      expect(error.requestId).toBe(REQUEST_ID);
    });

    it.each([
      ['a string', 'boom'],
      ['null', null],
      ['undefined', undefined],
      ['a number', 503],
      ['an object without errors', { message: 'boom' }],
      ['a response with an empty errors list', { errors: [] }],
    ])('maps %s to UNKNOWN_ERROR', (_case, value) => {
      const error = mapApiError(value, REQUEST_ID);

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.message).toBe('An unexpected error occurred');
      expect(error.requestId).toBe(REQUEST_ID);
    });
  });
});
