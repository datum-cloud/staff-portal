import { shouldRetryQuery } from './query';
import { CursorExpiredError } from '@/utils/errors';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';

/** The error shape axios throws for a failed HTTP response. */
function axiosResponseError(status: number): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const response: AxiosResponse = {
    data: { message: `Request failed with status code ${status}` },
    status,
    statusText: '',
    headers: {},
    config,
  };
  return new AxiosError(
    `Request failed with status code ${status}`,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    {},
    response
  );
}

describe('shouldRetryQuery', () => {
  it('does not retry a REST 4xx from the generated openapi client', () => {
    expect(shouldRetryQuery(0, axiosResponseError(404))).toBe(false);
  });

  it('retries a REST 408 because the request timed out', () => {
    expect(shouldRetryQuery(0, axiosResponseError(408))).toBe(true);
  });

  it('retries a REST 429 because the request was rate limited', () => {
    expect(shouldRetryQuery(0, axiosResponseError(429))).toBe(true);
  });

  it('retries a REST 5xx', () => {
    expect(shouldRetryQuery(0, axiosResponseError(503))).toBe(true);
  });

  it('retries a network error that never reached the server', () => {
    expect(shouldRetryQuery(0, new AxiosError('Network Error', AxiosError.ERR_NETWORK))).toBe(true);
  });

  it('does not retry a GraphQL AppError 4xx', () => {
    expect(shouldRetryQuery(0, new CursorExpiredError('cursor expired'))).toBe(false);
  });

  it('still stops after three failures', () => {
    expect(shouldRetryQuery(2, axiosResponseError(503))).toBe(true);
    expect(shouldRetryQuery(3, axiosResponseError(503))).toBe(false);
  });
});
