/** Sentry-compatible severity, kept local so the error model stays framework-agnostic. */
export type ErrorLevel = 'fatal' | 'error' | 'warning' | 'info';

export interface AppErrorOptions {
  /**
   * Whether this is a handled, anticipated failure (a 4xx the user caused or a
   * permission denial) rather than a bug. Expected errors are still logged and
   * shown, but are not reported to Sentry. Defaults to `true` for 4xx status.
   */
  expected?: boolean;
  /** Reporting/severity level. Defaults to `warning` for 4xx, `error` otherwise. */
  level?: ErrorLevel;
}

export class AppError extends Error {
  /** Anticipated (handled) failure vs. a bug worth reporting. */
  public expected: boolean;
  /** Severity used when the error is reported/logged. */
  public level: ErrorLevel;

  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public requestId?: string,
    options?: AppErrorOptions
  ) {
    super(message);
    this.name = this.constructor.name;
    this.expected = options?.expected ?? (statusCode >= 400 && statusCode < 500);
    this.level = options?.level ?? (statusCode >= 500 ? 'error' : 'warning');

    // V8/Bun only; guard so browsers without it (Safari/Firefox) don't throw.
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toResponse(): Response {
    const body = JSON.stringify({
      message: this.message,
      error: this.name,
      requestId: this.requestId,
    });

    return new Response(body, {
      status: this.statusCode,
      statusText: this.code,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
