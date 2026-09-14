import { isWatchRequest } from '@/server/lib/watch';
import { getToken } from '@/server/middleware';
import type { Context } from 'hono';

/**
 * True when the current request was aborted by the client going away. Prefers
 * the request signal (the source of truth for a *client* disconnect) over the
 * error's name, so an internal abort — e.g. an upstream timeout controller —
 * isn't misread as a client abort and silently swallowed. Proxy handlers use
 * this to answer a client abort with 499 instead of logging it as an error.
 */
export function isClientAbort(c: Context, error: unknown): boolean {
  return (
    Boolean(c.req.raw.signal?.aborted) || (error instanceof Error && error.name === 'AbortError')
  );
}

export interface ProxyRequest {
  /** Request path with the `/api/internal` prefix stripped, for logging. */
  path: string;
  method: string;
  /** Relative `path?query` for the buffered axios client (its baseURL is the API). */
  target: string;
  /** Absolute upstream URL for the streaming watch client (raw fetch). */
  url: string;
  headers: Record<string, string>;
  body?: string;
  /** True when the caller requested a `?watch=…` stream. */
  isWatch: boolean;
}

/**
 * Normalizes an inbound `/api/internal/*` request into the pieces both proxy
 * transports need: the upstream URL/target, the forwarded headers (auth + the
 * client's content-type/accept/user-agent/IP), the body, and whether it's a
 * watch. Shared so the streaming and buffered paths can't drift on how they
 * build the upstream call.
 */
export async function buildProxyRequest(c: Context, apiBaseUrl: string): Promise<ProxyRequest> {
  const path = c.req.path.replace(/^\/api\/internal/, '').replace(/^\//, '');
  const searchParams = c.req.query();
  const queryString = new URLSearchParams(searchParams).toString();
  const target = queryString ? `${path}?${queryString}` : path;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getToken(c)}`,
  };
  const contentType = c.req.header('Content-Type');
  if (contentType) headers['Content-Type'] = contentType;
  const accept = c.req.header('Accept');
  if (accept) headers['Accept'] = accept;
  const userAgent = c.req.header('User-Agent');
  if (userAgent) headers['User-Agent'] = userAgent;
  // Forward the client IP so the API server audit log captures it in sourceIPs.
  const clientIP = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim();
  if (clientIP) headers['X-Forwarded-For'] = clientIP;

  let body: string | undefined;
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    body = await c.req.text();
  }

  return {
    path,
    method: c.req.method,
    target,
    url: `${apiBaseUrl}/${target}`,
    headers,
    body,
    isWatch: isWatchRequest(searchParams.watch),
  };
}
