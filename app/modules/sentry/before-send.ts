import { fingerprintApiEvent } from './fingerprint';
import { isAppErrorLike, isIgnoredEvent } from './report-policy';
import { scrubEvent } from './scrub';

/**
 * The single reporting policy shared by both Sentry init sites (the browser
 * client in `app/entry.client.tsx` and the server provider in
 * `observability/providers/sentry.ts`). It runs on every outgoing event.
 *
 * Order matters: drop noise first (cheapest), then scrub what survives, then
 * group it. Kept as a factory so each init site owns its own instance and can
 * wrap it (the server composes it with a circuit breaker).
 */
export function createBeforeSend() {
  // Typed loosely (`any`) so a single handler satisfies both the browser
  // (`@sentry/react-router` ErrorEvent) and the server provider without
  // coupling this module to a specific Sentry package's event types.
  return function beforeSend(event: any, hint?: any): any {
    // 1. Known browser/deploy noise — never actionable.
    if (isIgnoredEvent(event, hint)) return null;

    // 2. Backstop for handled failures: an expected AppError thrown from a
    //    loader/action or reaching the error boundary is not a bug. The primary
    //    gate is in `captureApiError`; this catches paths that bypass it.
    const original = hint?.originalException;
    if (isAppErrorLike(original) && original.expected) return null;

    // 3. Strip secrets/tokens from anything that does leave the app.
    scrubEvent(event);

    // 4. Group API errors by endpoint instead of by stack/call-site.
    if (!event.fingerprint) {
      const fingerprint = fingerprintApiEvent(event);
      if (fingerprint) event.fingerprint = fingerprint;
    }

    return event;
  };
}
