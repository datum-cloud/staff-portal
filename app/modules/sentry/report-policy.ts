/**
 * What is worth reporting to Sentry.
 *
 * The portal already logs every API failure (`logApiError`) and surfaces it to
 * the user (toast / error boundary). Sentry should hold *unexpected* failures —
 * bugs and outages — not the steady stream of handled 4xx responses.
 */

/**
 * True when an API failure should become a Sentry issue.
 *
 * - no status (network / timeout / DNS) → report; it may be a real outage.
 * - 5xx → report; the upstream is broken.
 * - 4xx → skip; these are handled, logged, and shown to the user (a 403 on a
 *   resource, a 404, a 422 validation error) — not application bugs.
 */
export function shouldReportApiError(status?: number | null): boolean {
  if (status == null) return true;
  return status >= 500;
}

/** Structural check — `instanceof AppError` is unreliable across bundle copies. */
export function isAppErrorLike(
  error: unknown
): error is { statusCode: number; expected: boolean; level?: string } {
  return (
    !!error &&
    typeof error === 'object' &&
    typeof (error as any).statusCode === 'number' &&
    typeof (error as any).expected === 'boolean'
  );
}

/**
 * Browser/deploy noise that is never actionable: benign ResizeObserver loops,
 * non-Error rejections with no stack, and chunk/module load failures that just
 * mean the user was on an old deploy.
 */
export const IGNORE_ERROR_MESSAGES = [
  'ResizeObserver loop',
  'Non-Error promise rejection captured',
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
];

function extractMessage(event: Record<string, any>, hint?: Record<string, any>): string {
  const original = hint?.originalException;
  if (original instanceof Error && original.message) return original.message;
  if (typeof original === 'string') return original;
  if (typeof event?.message === 'string') return event.message;
  const values = event?.exception?.values;
  if (Array.isArray(values) && values[0]?.value) return String(values[0].value);
  return '';
}

/** True when the event matches a known-noise message and should be dropped. */
export function isIgnoredEvent(event: Record<string, any>, hint?: Record<string, any>): boolean {
  const message = extractMessage(event, hint);
  if (!message) return false;
  return IGNORE_ERROR_MESSAGES.some((pattern) => message.includes(pattern));
}
