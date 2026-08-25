/**
 * Stable grouping for API errors.
 *
 * Without a fingerprint, Sentry groups by stack trace — so the same failing
 * endpoint splits into many issues (one per call site) and per-resource ids in
 * the path explode the count further. We collapse those into one issue per
 * `method + normalized-route + status`.
 */

/** Replace id-like path segments with `:id` so `/projects/abc123` groups. */
export function normalizeEndpoint(url?: string | null): string {
  if (!url) return 'unknown';

  let path = url;
  try {
    // Second arg lets us parse relative paths (`/api/internal/...`) too.
    path = new URL(url, 'http://placeholder').pathname;
  } catch {
    // Not a URL — treat the raw string as a path.
  }

  return path
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      if (/^\d+$/.test(segment)) return ':id';
      if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(segment)) return ':id';
      if (/^[A-Za-z0-9._-]{24,}$/.test(segment)) return ':id';
      return segment;
    })
    .join('/');
}

/**
 * Build a fingerprint from the `error.*` tags set by `captureApiError`.
 * Returns `undefined` for non-API events so Sentry's default grouping stands.
 */
export function fingerprintApiEvent(event: Record<string, any>): string[] | undefined {
  const tags = event?.tags ?? {};
  if (tags['error.type'] !== 'api_request') return undefined;

  return [
    'api',
    String(tags['error.method'] ?? 'unknown'),
    normalizeEndpoint(tags['error.endpoint'] ? String(tags['error.endpoint']) : undefined),
    String(tags['error.status'] ?? 'unknown'),
  ];
}
