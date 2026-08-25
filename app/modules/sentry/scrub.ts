/**
 * Secret/token scrubbing for Sentry events.
 *
 * This is an internal admin tool, so we intentionally KEEP user identity
 * (id / email / name) — it's essential for debugging who hit an error. What we
 * strip are credentials and tokens that must never leave the app: auth headers,
 * cookies, bearer/JWT strings, and any field whose key looks like a secret.
 */

// Keys whose values are always redacted, wherever they appear in an event.
const SENSITIVE_KEY =
  /(authorization|cookie|set[-_]?cookie|x[-_]?api[-_]?key|api[-_]?key|client[-_]?secret|refresh[-_]?token|access[-_]?token|[-_]?token$|^token|secret|password|passwd|session[-_]?id|credential|private[-_]?key|bearer)/i;

// String values that look like a bearer header or a JWT are redacted by value,
// even when the key itself is innocuous (e.g. inside a free-form message).
const BEARER = /^Bearer\s+\S+/i;
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/;

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

function scrubString(value: string): string {
  if (BEARER.test(value)) return REDACTED;
  if (JWT.test(value)) return value.replace(JWT, REDACTED);
  return value;
}

/**
 * Deep-copy `value`, redacting secret-looking keys and token-looking strings.
 * Cycle-safe and depth-bounded so it is safe to run on arbitrary payloads.
 */
export function scrubValue<T>(value: T, seen: WeakSet<object> = new WeakSet(), depth = 0): T {
  if (value == null) return value;

  if (typeof value === 'string') return scrubString(value) as unknown as T;
  if (typeof value !== 'object') return value;

  if (seen.has(value as object)) return value;
  seen.add(value as object);

  if (depth >= MAX_DEPTH) return value;

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, seen, depth + 1)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(val, seen, depth + 1);
  }
  return out as unknown as T;
}

/**
 * Scrub the secret-bearing regions of a Sentry event in place: request headers,
 * cookies, body, query string, plus the free-form `extra` and `contexts` bags.
 */
export function scrubEvent(event: Record<string, any>): Record<string, any> {
  if (!event || typeof event !== 'object') return event;

  if (event.request && typeof event.request === 'object') {
    const req = event.request as Record<string, unknown>;
    if (req.headers) req.headers = scrubValue(req.headers);
    if (req.cookies) req.cookies = REDACTED;
    if (req.data) req.data = scrubValue(req.data);
    if (req.query_string) req.query_string = scrubValue(req.query_string);
  }

  if (event.extra) event.extra = scrubValue(event.extra);
  if (event.contexts) event.contexts = scrubValue(event.contexts);

  return event;
}
