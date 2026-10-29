/**
 * Shared HTTP helpers for assistant tools.
 *
 * Every tool surfaces failures to the model the same way — as a plain
 * `{ error }` object — so the model can relay or recover. These helpers
 * centralise bearer auth, request timeouts, and that uniform error shape so
 * individual tool files (Sentry, wiki, …) don't each re-implement them.
 *
 * Intentionally dependency-free (no `env`, no logger) so the pure helpers stay
 * importable from unit tests without booting the server config.
 */

export const DEFAULT_TIMEOUT_MS = 15_000;

export type ToolError = { error: string };

/** Narrows a tool result to the shared error shape. */
export function isToolError(value: unknown): value is ToolError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ToolError).error === 'string'
  );
}

interface JsonFetchOptions {
  method?: string;
  /** Bearer token; omitted when the endpoint needs no auth. */
  token?: string;
  headers?: Record<string, string>;
  /** When present, JSON-serialised as the request body (sets Content-Type). */
  body?: unknown;
  timeoutMs?: number;
  /** Prefix for error messages, e.g. "Sentry API", "Wiki". */
  label?: string;
}

/**
 * JSON fetch with bearer auth, a timeout, and a uniform `{ error }` result on
 * failure. Returns the parsed JSON on a 2xx response.
 */
export async function jsonFetch<T = any>(
  url: string,
  options: JsonFetchOptions = {}
): Promise<T | ToolError> {
  const {
    method = 'GET',
    token,
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    label = 'Request',
  } = options;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        error: `${label} error: ${res.status} ${parseErrorMessage(text) ?? res.statusText}`,
      };
    }

    return (await res.json()) as T;
  } catch (err) {
    return { error: `${label} request failed: ${err instanceof Error ? err.message : 'unknown'}` };
  }
}

/**
 * GraphQL POST helper.
 *
 * GraphQL servers answer auth/validation failures with HTTP 200 and an
 * `errors[]` array (e.g. Wiki.js `PageViewForbidden`), so a 2xx check alone is
 * not enough — this inspects the envelope and surfaces the first GraphQL error
 * as `{ error }`. Returns the `data` payload on success.
 */
export async function graphqlRequest<T = any>(
  url: string,
  query: string,
  variables: Record<string, unknown> = {},
  options: { token?: string; timeoutMs?: number; label?: string } = {}
): Promise<T | ToolError> {
  const label = options.label ?? 'GraphQL';

  const envelope = await jsonFetch<{ data?: T; errors?: Array<{ message?: string }> }>(url, {
    method: 'POST',
    token: options.token,
    timeoutMs: options.timeoutMs,
    label,
    body: { query, variables },
  });

  if (isToolError(envelope)) return envelope;

  const graphqlError = firstGraphqlError(envelope.errors);
  if (graphqlError) return { error: `${label} error: ${graphqlError}` };
  if (!envelope.data) return { error: `${label} error: empty response` };

  return envelope.data;
}

/** First message from a GraphQL `errors` array, if any. */
export function firstGraphqlError(errors?: Array<{ message?: string }>): string | undefined {
  if (!errors?.length) return undefined;
  return errors[0]?.message ?? 'unknown GraphQL error';
}

/** Best-effort extraction of a human message from a JSON error body. */
function parseErrorMessage(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body);
    return parsed?.message || parsed?.reason || parsed?.error;
  } catch {
    return undefined;
  }
}
