import { AppError } from './base';

const TIMEOUT_MESSAGE =
  'The request timed out while waiting for an upstream service. Please try again.';

/**
 * The gateway got no response headers from Milo within its deadline (10s).
 * The gateway's own message is kept when it names the timeout.
 */
export class UpstreamTimeoutError extends AppError {
  constructor(message?: string, requestId?: string) {
    super(
      message && /timed?\s*out/i.test(message) ? message : TIMEOUT_MESSAGE,
      504,
      'UPSTREAM_TIMEOUT',
      requestId
    );
  }
}

/**
 * Milo answered a non-OK status or the gateway's call to it threw. Carries the
 * upstream HTTP status from `extensions.status` when the gateway reported one.
 */
export class UpstreamError extends AppError {
  constructor(
    message: string = 'The upstream service returned an error',
    public upstreamStatus?: number,
    requestId?: string
  ) {
    super(message, 502, 'UPSTREAM_ERROR', requestId);
  }
}

/**
 * A continue token expired from the apiserver's watch cache (410). Callers
 * recover by restarting paging from the first page.
 */
export class CursorExpiredError extends AppError {
  constructor(
    message: string = 'The page cursor expired; restart from the first page',
    requestId?: string
  ) {
    super(message, 410, 'CURSOR_EXPIRED', requestId);
  }
}
