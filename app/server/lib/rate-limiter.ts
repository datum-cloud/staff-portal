/**
 * Fixed-window, in-memory rate limiter keyed by an arbitrary string.
 *
 * The map is bounded: once it holds `maxEntries` keys, expired windows are
 * dropped, and if it is still full the oldest windows are evicted. An evicted
 * key simply starts a fresh window on its next request.
 */
interface RateLimitWindow {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  /** Requests allowed per key within one window. */
  max: number;
  /** Upper bound on tracked keys. */
  maxEntries: number;
  now?: () => number;
}

export interface RateLimiter {
  /** Counts one request for `key`; false when the key is over its limit. */
  check: (key: string) => boolean;
  size: () => number;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { windowMs, max, maxEntries, now = Date.now } = options;
  const windows = new Map<string, RateLimitWindow>();

  function makeRoom(at: number): void {
    if (windows.size < maxEntries) return;

    for (const [key, entry] of windows) {
      if (at > entry.resetAt) windows.delete(key);
    }

    // Map iteration follows insertion order, so the first keys hold the oldest windows.
    for (const key of windows.keys()) {
      if (windows.size < maxEntries) break;
      windows.delete(key);
    }
  }

  function check(key: string): boolean {
    const at = now();
    const entry = windows.get(key);

    if (!entry || at > entry.resetAt) {
      // Delete first so a restarted window moves to the newest position.
      windows.delete(key);
      makeRoom(at);
      windows.set(key, { count: 1, resetAt: at + windowMs });
      return true;
    }

    if (entry.count >= max) return false;
    windows.set(key, { ...entry, count: entry.count + 1 });
    return true;
  }

  return { check, size: () => windows.size };
}
