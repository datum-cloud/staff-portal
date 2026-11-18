import { env } from '@/utils/config/env.server';
import { AuthorizationError } from '@/utils/errors';

/** Methods that only read; the browser may send them cross-site without harm. */
const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Whether a cookie-authenticated request may change state. Safe methods always
 * pass. Anything else needs an `Origin` equal to the app's own origin
 * (`APP_URL`), or, when the browser sent no Origin, `Sec-Fetch-Site:
 * same-origin`. A request with neither is refused, since the session cookie
 * alone can't tell a page of ours from a cross-site form.
 */
export function isSameOriginRequest(
  method: string,
  headers: { origin?: string; secFetchSite?: string },
  appOrigin: string = new URL(env.APP_URL).origin
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  if (headers.origin) return headers.origin === appOrigin;
  return headers.secFetchSite === 'same-origin';
}

/** Throws a 403 `AuthorizationError` when `isSameOriginRequest` refuses the request. */
export function assertSameOrigin(request: Request, requestId?: string): void {
  const allowed = isSameOriginRequest(request.method, {
    origin: request.headers.get('Origin') ?? undefined,
    secFetchSite: request.headers.get('Sec-Fetch-Site') ?? undefined,
  });
  if (!allowed) {
    throw new AuthorizationError('Cross-origin request refused', requestId);
  }
}
