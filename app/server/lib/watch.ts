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

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
