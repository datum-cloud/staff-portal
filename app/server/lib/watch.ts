const DISABLED_VALUES = new Set(['', 'false', '0']);

export function isWatchRequest(watch: string | undefined): boolean {
  return watch !== undefined && !DISABLED_VALUES.has(watch.toLowerCase());
}

export interface WatchProxyOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  requestId?: string;
  signal: AbortSignal;
  body?: string;
}

export async function proxyWatch(
  { url, method, headers, requestId, signal, body }: WatchProxyOptions,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const upstream = await fetchImpl(url, {
    method,
    headers: { ...headers, 'X-Request-ID': requestId ?? '' },
    signal,
    ...(body && { body }),
  });

  const contentType = upstream.headers.get('Content-Type') ?? 'application/json';

  // A failed watch is a one-shot error (a single K8s Status, then the upstream
  // closes), not a stream — fetch never rejects on HTTP status. Read it into a
  // finite body carrying the real status so the caller can log/report it (via
  // `logApiError`, which clones + parses a Response) and the client still sees
  // the true error, matching the buffered path.
  if (!upstream.ok) {
    const errorBody = await upstream.text().catch(() => '');
    return new Response(errorBody, {
      status: upstream.status,
      headers: { 'Content-Type': contentType },
    });
  }

  // 2xx: pipe the live stream straight to the client, unbuffered and untimed.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
